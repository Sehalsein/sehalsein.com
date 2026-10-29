import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { solveLimb } from "./ik";
import { Spring, smoother } from "./motion";

const v = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
function joint(parent: T.Object3D, name: string, p: T.Vector3) {
  const o = new T.Group();
  o.name = name;
  o.position.copy(p);
  parent.add(o);
  return o;
}

/** Metre-scale control rig. Skin, clothing, fingers and props use the same bones. */
export class Actor {
  root = new T.Group();
  pelvis = joint(this.root, "pelvis", v(0, 0.76, 0));
  spine = joint(this.pelvis, "spine", v(0, 0.26, 0));
  head = joint(this.spine, "head", v(0, 0.215, 0));
  arms = [-1, 1].map((s, i) =>
    joint(this.spine, `arm${i}`, v(s * 0.21, 0.13, 0)),
  );
  elbows = this.arms.map((a, i) => joint(a, `elbow${i}`, v(0, -0.25, 0)));
  hands = this.elbows.map((a, i) => joint(a, `hand${i}`, v(0, -0.23, 0)));
  legs = [-1, 1].map((s, i) => joint(this.pelvis, `leg${i}`, v(s * 0.1, 0, 0)));
  knees = this.legs.map((a, i) => joint(a, `knee${i}`, v(0, -0.33, 0)));
  feet = this.knees.map((a, i) => joint(a, `foot${i}`, v(0, -0.32, 0)));
  controls = [
    this.pelvis,
    this.spine,
    this.head,
    ...this.arms.flatMap((a, i) => [a, this.elbows[i], this.hands[i]]),
    ...this.legs.flatMap((a, i) => [a, this.knees[i], this.feet[i]]),
  ];
  grip = [0, 0];
  closedEyes = false;
  private blink = false;
  private eyeParts: T.Object3D[] = [];
  private lids = new T.Group();
  model = new T.Group();
  private bones = new Map<string, T.Bone>();
  private bind = new Map<string, T.Quaternion>();
  private fingerRest = new Map<string, T.Quaternion>();
  private rest = this.controls.map((o) => o.position.clone());
  private stance: T.Vector3[] = [];
  private previous = v();
  private step: {
    side: number;
    from: T.Vector3;
    to: T.Vector3;
    t: number;
    duration: number;
  } | null = null;
  private lastSide = 0;
  private close = { value: 0 };
  private blinkTimer = 2.2;
  private blinkLeft = 0;
  private lookYaw = new Spring(0, 70, 14);
  private lookPitch = new Spring(0, 70, 14);
  private lean = new Spring(0, 40, 11);
  private bank = new Spring(0, 30, 9);
  private lastSpeed = 0;
  private lastYaw = 0;
  // Hand IK requests this frame, kept so the torso can join a reach and the
  // arm can be re-solved from the same starting pose afterwards.
  private reaches: ({
    target: T.Vector3;
    weight: number;
    arm: T.Quaternion;
    elbow: T.Quaternion;
    orient: T.Quaternion | null;
  } | null)[] = [null, null];
  private spread = [0, 0];
  // Inertialized blending: a pose that jumps between frames is absorbed into
  // an offset that decays, so authored phase changes never pop.
  private blend: {
    p: T.Vector3[];
    q: T.Quaternion[];
    offP: T.Vector3[];
    offQ: T.Quaternion[];
  } | null = null;
  /** World point the head (and, when free, the chest) turns toward. */
  lookTarget: T.Vector3 | null = null;
  private headClose = { value: 0 };
  private bodyClose = { value: 0 };
  async load() {
    const asset = await new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .loadAsync("/models/studio/character.glb");
    this.model.add(asset.scene);
    this.root.add(this.model);
    this.root.updateMatrixWorld(true);
    asset.scene.traverse((o) => {
      if (o instanceof T.Bone) {
        this.bones.set(o.name, o);
        this.bind.set(o.name, o.getWorldQuaternion(new T.Quaternion()));
        this.fingerRest.set(o.name, o.quaternion.clone());
      }
      if (o instanceof T.Mesh) {
        o.castShadow = o.receiveShadow = true;
        o.frustumCulled = false;
        const positions = o.geometry.getAttribute("position"),
          heights = new Float32Array(positions.count),
          arms = new Float32Array(positions.count);
        const indices = o.geometry.getAttribute("skinIndex"),
          weights = o.geometry.getAttribute("skinWeight");
        for (let i = 0; i < positions.count; i++) {
          heights[i] = new T.Vector3()
            .fromBufferAttribute(positions, i)
            .applyMatrix4(o.matrixWorld).y;
          for (let j = 0; j < 4; j++) {
            const bone = (o as T.SkinnedMesh).skeleton?.bones[
              indices?.getComponent(i, j)
            ];
            if (bone && /^(arm|elbow|hand|finger|thumb)/.test(bone.name))
              arms[i] += weights.getComponent(i, j);
          }
        }
        o.geometry.setAttribute(
          "studioHeight",
          new T.BufferAttribute(heights, 1),
        );
        o.geometry.setAttribute("studioArm", new T.BufferAttribute(arms, 1));
        for (const material of Array.isArray(o.material)
          ? o.material
          : [o.material]) {
          const m = material as T.MeshStandardMaterial;
          m.onBeforeCompile = (s) => {
            s.uniforms.closeLens = this.close;
            s.uniforms.hideHead = this.headClose;
            s.uniforms.hideBody = this.bodyClose;
            s.vertexShader =
              "attribute float studioHeight; attribute float studioArm; varying float vStudioHeight; varying float vStudioArm;\n" +
              s.vertexShader;
            s.vertexShader = s.vertexShader.replace(
              "#include <begin_vertex>",
              "#include <begin_vertex>\nvStudioHeight=studioHeight;vStudioArm=studioArm;",
            );
            s.fragmentShader =
              "uniform float closeLens; uniform float hideHead; uniform float hideBody; varying float vStudioHeight; varying float vStudioArm;\n" +
              s.fragmentShader;
            s.fragmentShader = s.fragmentShader.replace(
              "#include <clipping_planes_fragment>",
              "#include <clipping_planes_fragment>\nfloat headDither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));\nif((vStudioHeight > 1.22 && headDither < hideHead) || (headDither < hideBody && (vStudioArm < .5 || closeLens < .5)) || (closeLens > .5 && length(vViewPosition) < .30 && vStudioArm < .5)) discard;",
            );
          };
        }
      }
    });
    const skin = this.model.getObjectByName("Warm_skin") as T.Mesh;
    const skinMat = (skin.material as T.MeshStandardMaterial).clone();
    skinMat.onBeforeCompile = () => {};
    this.head.add(this.lids);
    for (const s of [-1, 1]) {
      const lid = new T.Mesh(new T.SphereGeometry(1, 20, 12), skinMat);
      lid.position.set(s * 0.052, 0.144, 0.108);
      lid.scale.set(0.039, 0.024, 0.027);
      this.lids.add(lid);
      const crease = new T.Mesh(
        new T.TorusGeometry(0.029, 0.0015, 6, 20, Math.PI),
        new T.MeshStandardMaterial({ color: "#67422f", roughness: 1 }),
      );
      crease.position.set(s * 0.052, 0.144, 0.134);
      crease.rotation.z = Math.PI;
      crease.scale.y = 0.24;
      this.lids.add(crease);
    }
    for (const name of ["Eye_whites", "Hazel_iris", "Pupil"]) {
      const o = this.model.getObjectByName(name);
      if (o) this.eyeParts.push(o);
    }
  }
  reset(time: number) {
    this.closedEyes = false;
    this.reaches = [null, null];
    this.controls.forEach((o, i) => {
      o.position.copy(this.rest[i]);
      o.quaternion.identity();
    });
    // Idle is layered, not looped: breath, a slow weight shift between feet and
    // a counter-tilt through the chest, each on unrelated periods.
    const breath = Math.sin(time * 1.55),
      shift = Math.sin(time * 0.29) + 0.35 * Math.sin(time * 0.71 + 1.3);
    this.spine.rotation.x = breath * 0.013;
    this.pelvis.position.y += breath * 0.0025 - Math.abs(shift) * 0.004;
    this.pelvis.position.x = shift * 0.011;
    this.pelvis.rotation.z = shift * 0.016;
    this.spine.rotation.z = -shift * 0.012;
    this.head.rotation.z = shift * 0.01;
    this.head.rotation.y = Math.sin(time * 0.42) * 0.03;
    this.arms[0].rotation.z = -0.075 - breath * 0.012 + shift * 0.01;
    this.arms[1].rotation.z = 0.075 + breath * 0.012 + shift * 0.01;
    this.arms.forEach((a) => (a.position.y += breath * 0.004));
    this.elbows.forEach(
      (a, i) => (a.rotation.x = -0.16 - Math.sin(time * 0.37 + i) * 0.03),
    );
  }
  /**
   * Secondary motion applied after the authored pose: blinks on an irregular
   * clock, and a sprung head turn toward `lookTarget`. `free` lets the chest
   * follow the head a little when no hand is pinned by IK.
   */
  life(dt: number, free: boolean, weight = 1) {
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.blinkLeft = 0.12;
      this.blinkTimer = Math.random() < 0.2 ? 0.22 : 1.8 + Math.random() * 3.6;
    }
    this.blinkLeft -= dt;
    this.blink = this.blinkLeft > 0;
    let yaw = 0,
      pitch = 0;
    if (this.lookTarget && weight > 0) {
      this.root.updateMatrixWorld(true);
      const local = this.spine
        .worldToLocal(this.lookTarget.clone())
        .sub(this.head.position)
        .sub(v(0, 0.12, 0));
      const turn = Math.atan2(local.x, local.z);
      // Past the shoulder the head gives up rather than snapping around.
      const reach = 1 - T.MathUtils.smoothstep(Math.abs(turn), 1.5, 2.3);
      yaw = T.MathUtils.clamp(turn, -1.05, 1.05) * reach * weight;
      pitch =
        T.MathUtils.clamp(
          -Math.atan2(local.y, Math.hypot(local.x, local.z)),
          -0.42,
          0.5,
        ) *
        reach *
        weight;
    }
    const y = this.lookYaw.step(yaw, dt),
      x = this.lookPitch.step(pitch, dt);
    this.head.rotation.y += y * (free ? 0.78 : 1);
    this.head.rotation.x += x;
    if (free) {
      this.spine.rotation.y += y * 0.22;
      this.spine.rotation.x += x * 0.12;
    }
  }
  setFirstPerson(on: boolean) {
    this.close.value = on ? 1 : 0;
  }
  updateLens(position: T.Vector3) {
    const center = this.head.localToWorld(v(0, 0.11, 0.02));
    // A camera passing through the torso dissolves it instead of clipping.
    const chest = this.spine.localToWorld(v(0, 0.12, 0));
    this.bodyClose.value =
      1 - T.MathUtils.smoothstep(position.distanceTo(chest), 0.42, 0.85);
    this.headClose.value =
      1 - T.MathUtils.smoothstep(position.distanceTo(center), 0.5, 0.67);
  }
  hand(side: number, target: T.Vector3, weight = 1) {
    let r = this.reaches[side];
    if (!r)
      r = this.reaches[side] = {
        target: v(),
        weight: 0,
        arm: this.arms[side].quaternion.clone(),
        elbow: this.elbows[side].quaternion.clone(),
        orient: null,
      };
    r.target.copy(target);
    r.weight = weight;
    r.orient = null;
    this.solveHand(side, target, weight);
  }
  private solveHand(side: number, target: T.Vector3, weight: number) {
    // Hands arrive from slightly above and leave the same way, instead of
    // sliding along a straight line into the contact point.
    const approach = weight * (1 - weight) * 4 * 0.055;
    const goal =
      approach > 0 ? target.clone().setY(target.y + approach) : target;
    const pole = this.root.localToWorld(v(side ? 0.58 : -0.58, 0.88, 0.25));
    solveLimb(
      this.arms[side],
      this.elbows[side],
      this.hands[side],
      goal,
      pole,
      weight,
    );
  }
  /** Sets the hand's world rotation (for held props) after IK. */
  orientHand(side: number, world: T.Quaternion) {
    this.hands[side].quaternion.copy(
      this.elbows[side]
        .getWorldQuaternion(new T.Quaternion())
        .invert()
        .multiply(world),
    );
    this.hands[side].updateWorldMatrix(false, true);
    if (this.reaches[side]) this.reaches[side]!.orient = world.clone();
  }
  /**
   * The torso joins a reach: it leans toward far or low targets and turns
   * toward the side doing the work. Arms are then re-solved from their
   * pre-IK pose so contacts stay exact.
   */
  engage(amount = 1) {
    let lean = 0,
      twist = 0,
      any = false;
    this.root.updateMatrixWorld(true);
    const shoulder = this.pelvis.position.y + 0.39;
    for (let side = 0; side < 2; side++) {
      const r = this.reaches[side];
      this.spread[side] = r ? r.weight * (1 - r.weight) * 4 : 0;
      if (!r || r.weight < 0.01) continue;
      any = true;
      const local = this.root.worldToLocal(r.target.clone());
      const far = Math.max(0, Math.hypot(local.x * 0.6, local.z) - 0.28);
      const low = Math.max(0, shoulder - 0.22 - local.y);
      lean += (far * 0.8 + low * 0.5) * r.weight;
      twist += Math.atan2(local.x, Math.max(0.2, local.z)) * 0.28 * r.weight;
    }
    if (!any || amount <= 0) return;
    lean = T.MathUtils.clamp(lean, 0, 0.34) * amount;
    twist = T.MathUtils.clamp(twist, -0.32, 0.32) * amount;
    this.spine.rotation.x += lean;
    this.spine.rotation.y += twist;
    this.head.rotation.x -= lean * 0.45;
    this.head.rotation.y -= twist * 0.5;
    this.spine.updateWorldMatrix(true, true);
    for (let side = 0; side < 2; side++) {
      const r = this.reaches[side];
      if (!r || r.weight < 0.01) continue;
      this.arms[side].quaternion.copy(r.arm);
      this.elbows[side].quaternion.copy(r.elbow);
      this.solveHand(side, r.target, r.weight);
      if (r.orient) {
        const orient = r.orient;
        this.orientHand(side, orient);
      }
    }
  }
  /**
   * Hip-hinge weight transfer for sitting (0 standing → 1 seated) and for
   * rising (0 seated → 1 standing). The chest travels forward over the knees
   * before the hips move, which is what reads as weight.
   */
  static hinge(progress: number, rising = false) {
    const t = Math.max(0, Math.min(1, progress));
    if (rising) {
      const lean = Math.sin(Math.PI * Math.pow(t, 0.65)) * 0.5;
      return { lean, seat: 1 - smoother((t - 0.24) / 0.76) };
    }
    const lean = Math.sin(Math.PI * Math.pow(t, 1.2)) * 0.42;
    return { lean, seat: smoother((t - 0.12) / 0.88) };
  }
  foot(side: number, target: T.Vector3, weight = 1) {
    solveLimb(
      this.legs[side],
      this.knees[side],
      this.feet[side],
      target,
      this.root.localToWorld(v(side ? 0.15 : -0.15, 0.39, 0.8)),
      weight,
    );
    this.feet[side].quaternion.slerp(
      this.knees[side]
        .getWorldQuaternion(new T.Quaternion())
        .invert()
        .multiply(this.root.getWorldQuaternion(new T.Quaternion())),
      weight,
    );
  }
  resetGait() {
    this.stance = [];
    this.step = null;
    this.lastSpeed = 0;
    this.lastYaw = this.root.rotation.y;
  }
  walk(dt: number, speed: number) {
    const desired = [-1, 1].map((s) =>
      this.root.localToWorld(v(s * 0.1, 0.11, 0.02)).setY(0.11),
    );
    if (!this.stance.length) {
      this.stance = desired.map((p) => p.clone());
      this.previous.copy(this.root.position);
    }
    const velocity = this.root.position
      .clone()
      .sub(this.previous)
      .divideScalar(Math.max(0.001, dt));
    velocity.y = 0;
    velocity.clampLength(0, 1.9);
    this.previous.copy(this.root.position);
    if (!this.step) {
      const side = 1 - this.lastSide;
      if (
        this.stance[side].distanceTo(desired[side]) >
        (speed > 0.03 ? 0.025 : 0.045)
      ) {
        this.step = {
          side,
          from: this.stance[side].clone(),
          to: desired[side].clone().addScaledVector(velocity, 0.16),
          t: 0,
          duration: speed > 0.03 ? 0.24 : 0.17,
        };
        this.lastSide = side;
      }
    }
    if (this.step) {
      const s = this.step;
      s.t += dt;
      const t = Math.min(1, s.t / s.duration);
      const e = t * t * (3 - 2 * t);
      this.stance[s.side].lerpVectors(s.from, s.to, e);
      this.stance[s.side].y += Math.sin(t * Math.PI) * 0.085;
      if (t === 1) this.step = null;
    }
    const pace = Math.min(speed, 1.6) / 1.6,
      phase = this.step ? Math.min(1, this.step.t / this.step.duration) : 0,
      swing = this.step
        ? Math.sin(phase * Math.PI) * (this.step.side ? -1 : 1)
        : 0;
    // Lean into acceleration and into turns; both settle on springs so a stop
    // rocks back slightly instead of freezing upright.
    const accel = (speed - this.lastSpeed) / Math.max(0.001, dt);
    this.lastSpeed = speed;
    const yawRate =
      Math.atan2(
        Math.sin(this.root.rotation.y - this.lastYaw),
        Math.cos(this.root.rotation.y - this.lastYaw),
      ) / Math.max(0.001, dt);
    this.lastYaw = this.root.rotation.y;
    const lean = this.lean.step(
      pace * 0.075 + T.MathUtils.clamp(accel, -6, 6) * 0.006,
      dt,
    );
    const bank = this.bank.step(
      T.MathUtils.clamp(yawRate * pace, -5, 5) * -0.012,
      dt,
    );
    this.pelvis.position.y +=
      (Math.sin(phase * Math.PI) * 0.026 - 0.016) * pace;
    this.pelvis.rotation.y = swing * 0.11 * pace;
    this.pelvis.rotation.z = -swing * 0.03 + bank;
    this.spine.rotation.y = -swing * 0.2 * pace;
    this.spine.rotation.x += lean;
    this.spine.rotation.z += bank * 0.6;
    this.head.rotation.x -=
      lean * 0.75 - Math.sin(phase * Math.PI * 2) * 0.02 * pace;
    this.head.rotation.y += swing * 0.08 * pace;
    // Turning in place, a planted foot must not end up on the other side of
    // the body: it pivots outward instead, so the legs never cross.
    this.root.updateMatrixWorld(true);
    this.stance.forEach((p, i) => {
      const local = this.root.worldToLocal(p.clone()),
        side = i ? 1 : -1;
      if (local.x * side < 0.06) {
        local.x = side * 0.06;
        const y = p.y;
        p.copy(this.root.localToWorld(local)).setY(y);
      }
    });
    this.stance.forEach((p, i) => this.foot(i, p));
    this.arms.forEach((a, i) => {
      const s = (this.step ? swing * (i ? -1 : 1) : 0) * pace;
      a.rotation.x = s * 0.52 - 0.04;
      a.rotation.z += (i ? 1 : -1) * pace * 0.04;
      this.elbows[i].rotation.x -= pace * 0.22 + Math.max(0, s) * 0.42;
    });
  }
  sit(
    seat: T.Vector3,
    yaw: number,
    blend = 1,
    hip = 0.565,
    footDistance = 0.31,
  ) {
    this.root.rotation.set(0, yaw, 0);
    const hinge =
      blend >= 1 || blend <= 0 ? { lean: 0, seat: blend } : Actor.hinge(blend);
    const lean = hinge.lean;
    this.pelvis.position.y = T.MathUtils.lerp(0.76, hip, hinge.seat);
    this.pelvis.position.z =
      T.MathUtils.lerp(0, -0.04, hinge.seat) - lean * 0.12;
    this.spine.rotation.x = -0.05 + lean;
    this.head.rotation.x -= lean * 0.5;
    for (let i = 0; i < 2; i++) {
      const local = v(i ? 0.1 : -0.1, 0.11, footDistance);
      const target = local
        .applyAxisAngle(v(0, 1, 0), yaw)
        .add(seat)
        .setY(0.11);
      this.foot(i, target, blend);
    }
  }
  private settle(dt: number) {
    const parts = [this.root, ...this.controls];
    if (!this.blend) {
      this.blend = {
        p: parts.map((o) => o.position.clone()),
        q: parts.map((o) => o.quaternion.clone()),
        offP: parts.map(() => v()),
        offQ: parts.map(() => new T.Quaternion()),
      };
      return;
    }
    const b = this.blend,
      decay = 1 - Math.exp(-dt / 0.085),
      jumpP = Math.max(0.035, 2.6 * dt),
      jumpQ = Math.max(0.12, 14 * dt),
      identity = new T.Quaternion();
    parts.forEach((o, i) => {
      // Arms that are holding or reaching keep exact contact.
      const arm = i >= 4 && i <= 9 ? (i < 7 ? 0 : 1) : -1;
      if (
        arm >= 0 &&
        (this.grip[arm] > 0.05 || (this.reaches[arm]?.weight ?? 0) > 0.3)
      ) {
        b.offP[i].set(0, 0, 0);
        b.offQ[i].identity();
      } else if (
        o.position.distanceTo(b.p[i]) > jumpP ||
        b.q[i].angleTo(o.quaternion) > jumpQ
      ) {
        // Keep the shown pose continuous: final_prev = off ∘ prev.
        b.offP[i].add(b.p[i]).sub(o.position);
        b.offQ[i].multiply(b.q[i]).multiply(o.quaternion.clone().invert());
      }
      b.p[i].copy(o.position);
      b.q[i].copy(o.quaternion);
      b.offP[i].multiplyScalar(1 - decay);
      b.offQ[i].slerp(identity, decay);
    });
    // Joint offsets apply in place; joints are rebuilt every frame.
    for (let i = 1; i < parts.length; i++) {
      parts[i].position.add(b.offP[i]);
      parts[i].quaternion.premultiply(b.offQ[i]);
    }
    // The root is authored state that sequences read back, so its offset is
    // carried by the pelvis (everything visible hangs from it) instead.
    if (b.offP[0].lengthSq() > 1e-8 || b.offQ[0].angleTo(identity) > 1e-4) {
      const authored = new T.Matrix4().compose(
          this.root.position,
          this.root.quaternion,
          new T.Vector3(1, 1, 1),
        ),
        shown = new T.Matrix4().compose(
          this.root.position.clone().add(b.offP[0]),
          b.offQ[0].clone().multiply(this.root.quaternion),
          new T.Vector3(1, 1, 1),
        ),
        pelvis = new T.Matrix4().compose(
          this.pelvis.position,
          this.pelvis.quaternion,
          new T.Vector3(1, 1, 1),
        );
      authored
        .invert()
        .multiply(shown)
        .multiply(pelvis)
        .decompose(this.pelvis.position, this.pelvis.quaternion, v());
    }
  }
  sync(dt = 0) {
    if (dt > 0) this.settle(dt);
    const closed = this.closedEyes || this.blink;
    this.lids.visible = closed && this.headClose.value < 0.5;
    this.eyeParts.forEach((o) => (o.visible = !closed));
    this.root.updateMatrixWorld(true);
    // Hierarchical order matters: parents are written before each child.
    const ordered = [
      this.pelvis,
      this.spine,
      this.head,
      ...this.arms.flatMap((a, i) => [a, this.elbows[i], this.hands[i]]),
      ...this.legs.flatMap((a, i) => [a, this.knees[i], this.feet[i]]),
    ];
    for (const c of ordered) {
      const b = this.bones.get(c.name);
      if (!b) continue;
      const p = c.getWorldPosition(v());
      const q = c
        .getWorldQuaternion(new T.Quaternion())
        .multiply(this.bind.get(c.name)!);
      b.position.copy(b.parent!.worldToLocal(p));
      b.quaternion.copy(
        b.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(q),
      );
      b.updateWorldMatrix(false, false);
    }
    for (let i = 0; i < 2; i++)
      for (let f = 0; f < 4; f++)
        for (let j = 0; j < 3; j++) {
          const name = `finger${i}_${f}_${j}`,
            b = this.bones.get(name);
          if (b)
            b.quaternion.copy(this.fingerRest.get(name)!).multiply(
              new T.Quaternion().setFromAxisAngle(
                v(1, 0, 0),
                // Fingers open a little on the way in, then close.
                -(
                  this.grip[i] -
                  this.spread[i] * 0.3 * (1 - Math.min(1, this.grip[i] * 4))
                ) * (j === 1 ? 1.25 : 0.85),
              ),
            );
        }
    for (let i = 0; i < 2; i++) {
      const b = this.bones.get(`thumb${i}`);
      if (b)
        b.quaternion
          .copy(this.fingerRest.get(`thumb${i}`)!)
          .multiply(
            new T.Quaternion().setFromAxisAngle(
              v(1, 0, 0),
              -this.grip[i] * 0.45,
            ),
          );
    }
    this.model.updateMatrixWorld(true);
  }
}
