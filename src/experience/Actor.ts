import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { solveLimb } from "./ik";
import { Spring } from "./motion";

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
  /** World point the head (and, when free, the chest) turns toward. */
  lookTarget: T.Vector3 | null = null;
  private headClose = { value: 0 };
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
            s.vertexShader =
              "attribute float studioHeight; attribute float studioArm; varying float vStudioHeight; varying float vStudioArm;\n" +
              s.vertexShader;
            s.vertexShader = s.vertexShader.replace(
              "#include <begin_vertex>",
              "#include <begin_vertex>\nvStudioHeight=studioHeight;vStudioArm=studioArm;",
            );
            s.fragmentShader =
              "uniform float closeLens; uniform float hideHead; varying float vStudioHeight; varying float vStudioArm;\n" +
              s.fragmentShader;
            s.fragmentShader = s.fragmentShader.replace(
              "#include <clipping_planes_fragment>",
              "#include <clipping_planes_fragment>\nfloat headDither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));\nif((vStudioHeight > 1.22 && headDither < hideHead) || (closeLens > .5 && length(vViewPosition) < .30 && vStudioArm < .5)) discard;",
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
    this.headClose.value =
      1 - T.MathUtils.smoothstep(position.distanceTo(center), 0.5, 0.67);
  }
  hand(side: number, target: T.Vector3, weight = 1) {
    const pole = this.root.localToWorld(v(side ? 0.58 : -0.58, 0.88, 0.25));
    solveLimb(
      this.arms[side],
      this.elbows[side],
      this.hands[side],
      target,
      pole,
      weight,
    );
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
      (Math.sin(phase * Math.PI) * 0.016 - 0.012) * pace;
    this.pelvis.rotation.y = swing * 0.075 * pace;
    this.pelvis.rotation.z = -swing * 0.03 + bank;
    this.spine.rotation.y = -swing * 0.13 * pace;
    this.spine.rotation.x += lean;
    this.spine.rotation.z += bank * 0.6;
    this.head.rotation.x -= lean * 0.75;
    this.stance.forEach((p, i) => this.foot(i, p));
    this.arms.forEach((a, i) => {
      const s = (this.step ? swing * (i ? -1 : 1) : 0) * pace;
      a.rotation.x = s * 0.34 - 0.04;
      a.rotation.z += (i ? 1 : -1) * pace * 0.04;
      this.elbows[i].rotation.x -= pace * 0.18 + Math.max(0, s) * 0.22;
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
    this.pelvis.position.y = T.MathUtils.lerp(0.76, hip, blend);
    this.pelvis.position.z = T.MathUtils.lerp(0, -0.04, blend);
    this.spine.rotation.x = -0.05;
    for (let i = 0; i < 2; i++) {
      const local = v(i ? 0.1 : -0.1, 0.11, footDistance);
      const target = local
        .applyAxisAngle(v(0, 1, 0), yaw)
        .add(seat)
        .setY(0.11);
      this.foot(i, target, blend);
    }
  }
  sync() {
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
            b.quaternion
              .copy(this.fingerRest.get(name)!)
              .multiply(
                new T.Quaternion().setFromAxisAngle(
                  v(1, 0, 0),
                  -this.grip[i] * (j === 1 ? 1.25 : 0.85),
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
