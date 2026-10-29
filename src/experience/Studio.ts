import * as T from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { Actor } from "./Actor";
import { Lighting } from "./Lighting";
import { SPOTS, type Spot, type View } from "./objects";
import {
  findPath,
  moveWithCollision,
  advancePath,
  canStand,
  type Point,
  OBSTACLES,
} from "./navigation";
import {
  between,
  angle,
  arc,
  smoother,
  easeOut,
  back,
  wobble,
  window01,
  Spring,
  type Action,
} from "./motion";
import { WorldSurfaces, type SurfaceId } from "./surfaces";
import { consolidateGeometry } from "./optimize";
import { planCameraPath, type TravelPath, type KeepOut } from "./camera";

const v = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const up = v(0, 1, 0);
type State = {
  view: View;
  busy: boolean;
  label: string;
  focus: Spot | null;
  visited: Spot[];
  ready: boolean;
  night: boolean;
};
type Lens = {
  path: TravelPath;
  from: T.Vector3;
  to: T.Vector3;
  fov: number;
  targetFov: number;
  t: number;
  duration: number;
};
export class Studio {
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(40, 1, 0.035, 70);
  renderer: T.WebGLRenderer;
  actor = new Actor();
  keys = new Set<string>();
  surfaces: WorldSurfaces;
  room!: T.Group;
  lighting: Lighting;
  state: State = {
    view: "room",
    busy: false,
    label: "Make yourself at home.",
    focus: null,
    visited: [],
    ready: false,
    night: false,
  };
  private action: Action | null = null;
  private lens: Lens | null = null;
  private lensTarget = v(0, 0.86, 0);
  private nodes = new Map<string, T.Object3D>();
  private path: Point[] = [];
  private pending: Spot | null = null;
  private speed = 0;
  private time = 0;
  private last = 0;
  private frame = 0;
  private disposed = false;
  private entered = false;
  private observer: ResizeObserver;
  private cleanups: (() => void)[] = [];
  private raycaster = new T.Raycaster();
  private mouse = new T.Vector2();
  private down: { x: number; y: number; drag: boolean } | null = null;
  private yaw = 0.63;
  private zoom = 1;
  private lampOn = true;
  private curtain = 0;
  private queueBack = false;
  private hold: {
    side: number;
    object: T.Object3D;
    parent: T.Object3D;
    p: T.Vector3;
    q: T.Quaternion;
    relative: T.Quaternion;
    offset: T.Vector3;
    target: T.Vector3;
    rotation: T.Quaternion;
  } | null = null;
  private bubble: T.Sprite;
  private dream = new T.Group();
  private stars: T.Points;
  private dreamPhase = 0;
  private portrait = false;
  private paused = false;
  private viewShift = 1;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private surfaceElements = new Map<SurfaceId, HTMLElement>();
  // Feel layer: everything below is secondary motion and feedback.
  private hover: Spot | null = null;
  private hoverActor = false;
  private glow = new Map<
    Spot,
    { spring: Spring; materials: T.MeshStandardMaterial[] }
  >();
  private tag = document.createElement("div");
  private tagPos = new T.Vector2(-999, -999);
  private pointer = new T.Vector2();
  private pointerSeen = false;
  private parallax = { x: new Spring(0, 30, 10), y: new Spring(0, 30, 10) };
  private yawVelocity = 0;
  private zoomTarget = 1;
  private lastDrag = 0;
  private gaze: T.Vector3 | null = null;
  private glance: { target: T.Vector3 | null; until: number } = {
    target: null,
    until: 2,
  };
  private ripple: T.Mesh;
  private rippleTime = -1;
  private emotes: { sprite: T.Sprite; t: number }[] = [];
  private emoteCache = new Map<string, T.SpriteMaterial>();
  private bumps = new Map<
    T.Object3D,
    { base: T.Vector3; t: number; strength: number }
  >();
  private jacket = 0;
  private pokes = 0;
  constructor(
    private host: HTMLElement,
    private emit: (state: State) => void,
    private fade: (value: number) => void,
  ) {
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.info.autoReset = false;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setClearColor("#ecdfc9");
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Playable bedroom. WASD or arrow keys to walk. E to interact. Escape to step back.",
    );
    this.host.append(this.renderer.domElement);
    this.scene.background = new T.Color("#ecdfc9");
    this.scene.add(this.actor.root);
    this.surfaces = new WorldSurfaces(host);
    this.lighting = new Lighting(this.renderer, this.scene, this.camera);
    const ground = new T.Mesh(
      new T.PlaneGeometry(200, 200),
      new T.MeshStandardMaterial({ color: "#ecdfc9", roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.3;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.bubble = this.makeBubble();
    this.scene.add(this.bubble);
    this.bubble.visible = false;
    this.stars = this.makeDream();
    this.scene.add(this.dream);
    this.dream.visible = false;
    this.ripple = new T.Mesh(
      new T.RingGeometry(0.07, 0.095, 40),
      new T.MeshBasicMaterial({
        color: "#fff4dc",
        transparent: true,
        depthWrite: false,
        opacity: 0,
      }),
    );
    this.ripple.rotation.x = -Math.PI / 2;
    this.ripple.renderOrder = 2;
    this.ripple.visible = false;
    this.scene.add(this.ripple);
    this.tag.className = "hover-tag";
    this.tag.setAttribute("aria-hidden", "true");
    host.append(this.tag);
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    this.events();
  }
  private notify(p: Partial<State> = {}) {
    this.state = { ...this.state, ...p };
    this.emit({ ...this.state, visited: [...this.state.visited] });
  }
  private node(name: string) {
    const o = this.nodes.get(name);
    if (!o) throw new Error(`Missing Blender node: ${name}`);
    return o;
  }
  async start() {
    const [asset] = await Promise.all([
      new GLTFLoader()
        .setMeshoptDecoder(MeshoptDecoder)
        .loadAsync("/models/studio/bedroom.glb"),
      this.actor.load(),
    ]);
    if (this.disposed) return;
    this.room = asset.scene;
    this.scene.add(this.room);
    this.room.traverse((o) => {
      this.nodes.set(o.name, o);
      if (o instanceof T.Mesh) {
        o.castShadow = o.receiveShadow = true;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          (m as T.MeshStandardMaterial).shadowSide = T.FrontSide;
        }
      }
    });
    const treated = new Set<T.Material>();
    this.room.traverse((o) => {
      if (!(o instanceof T.Mesh)) return;
      for (const mat of Array.isArray(o.material) ? o.material : [o.material]) {
        if (treated.has(mat)) continue;
        treated.add(mat);
        const m = mat as T.MeshStandardMaterial;
        const wood = /oak|walnut|Oak tone/i.test(m.name),
          cloth = false;
        if (!wood && !cloth) continue;
        m.onBeforeCompile = (shader) => {
          shader.vertexShader =
            "varying vec3 studioSurface;\n" + shader.vertexShader;
          shader.vertexShader = shader.vertexShader.replace(
            "#include <worldpos_vertex>",
            "#include <worldpos_vertex>\nstudioSurface=(modelMatrix*vec4(transformed,1.)).xyz;",
          );
          shader.fragmentShader =
            "varying vec3 studioSurface;\n" + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <map_fragment>",
            `#include <map_fragment>\n diffuseColor.rgb *= ${wood ? "(.98 + .012*sin(studioSurface.z*110. + 10.*sin(studioSurface.x*1.5)) + .008*sin(studioSurface.z*221. + 5.*sin(studioSurface.x*3.)))" : "(.98 + .02*sin(studioSurface.x*1600.)*sin((studioSurface.y+studioSurface.z)*1400.))"};`,
          );
        };
        m.customProgramCacheKey = () => (wood ? "studio-oak" : "studio-cloth");
      }
    });
    // Hand-held pages sit within a seated reach, on the front edge of the desk.
    const paper = this.node("Paper");
    paper.position.x = -0.47;
    paper.position.z = 0.29;
    paper.position.y = 0.825;
    this.node("Lounge").rotation.y = -0.65;
    const boundaries = [
      "Desk",
      "Bed",
      "Chair",
      "Mug",
      "Paper",
      "Notebook",
      "Figure",
      "Controller",
      "WateringCan",
      "CarePlant",
      "CurtainCord",
      "Quilt",
      "Display",
      "ComputerSurface",
      "TVSurface",
      "Lamp",
      "Curtains",
      "Curtain-1",
      "Curtain1",
      "Door-1",
      "Door1",
      "Board",
      "Wardrobe",
      "Media",
      "Bookshelf",
      "Nightstand",
      "Art0",
      "Art1",
      "Art2",
    ]
      .map((n) => this.nodes.get(n))
      .filter((x): x is T.Object3D => !!x);
    consolidateGeometry(this.room, boundaries);
    this.room.updateMatrixWorld(true);
    this.paintScreen("ComputerSurface", false);
    this.paintScreen("TVSurface", true);
    this.prepareGlow();
    this.actor.root.position.set(-0.4, 0, 0.76);
    this.actor.root.rotation.y = -0.3;
    this.actor.reset(0);
    this.actor.sync();
    this.camera.position.copy(this.overview());
    this.camera.lookAt(this.lensTarget);
    this.camera.updateMatrixWorld();
    for (const [id, el] of this.surfaceElements) this.mountSurface(id, el);
    this.notify({ ready: true });
    this.frame = requestAnimationFrame(this.tick);
  }
  enter() {
    this.entered = true;
    this.renderer.domElement.focus();
  }
  private overview() {
    const distance = (this.portrait ? 13.5 : 10.7) * this.zoom;
    return v(
      Math.sin(this.yaw) * distance,
      0.86 + distance * 0.58,
      Math.cos(this.yaw) * distance,
    );
  }
  private obstacles(): KeepOut[] {
    const boxes = OBSTACLES.map((o, i) => ({
      name: `Furniture ${i}`,
      box: new T.Box3(
        v(o.x - o.width / 2, 0, o.z - o.depth / 2),
        v(
          o.x + o.width / 2,
          [0.75, 0.81, 2.03, 0.64, 1.84, 1.18, 0.94, 0.55, 0.95, 0.64][i],
          o.z + o.depth / 2,
        ),
      ),
    })).filter((_, i) => i !== 8);
    // Dynamic chair uses its current location; the monitor has its own swept volume.
    for (const name of ["Chair", "Monitor"])
      boxes.push({ name, box: new T.Box3().setFromObject(this.node(name)) });
    boxes.push(
      {
        name: "Back wall",
        box: new T.Box3(v(-2.91, 0, -2.54), v(2.91, 2.86, -2.4)),
      },
      {
        name: "Left wall",
        box: new T.Box3(v(-2.94, 0, -2.54), v(-2.8, 2.86, 2.44)),
      },
    );
    return boxes;
  }
  private cameraTo(p: T.Vector3, target: T.Vector3, duration = 0.8, fov = 45) {
    this.lens = {
      path: planCameraPath(this.camera.position, p, this.obstacles(), 0.045),
      from: this.lensTarget.clone(),
      to: target.clone(),
      fov: this.camera.fov,
      targetFov: fov,
      t: 0,
      duration: this.reduced ? 0.22 : duration,
    };
  }
  // The room camera leans a third of the way toward the character, so the
  // frame follows them around instead of staring at the centre of the rug.
  private follow() {
    const p = this.actor.root.position;
    return v(
      T.MathUtils.clamp(p.x, -2, 2) * 0.3,
      0,
      T.MathUtils.clamp(p.z, -2, 2) * 0.22,
    );
  }
  private roomCamera(duration = 0.85) {
    const f = this.follow();
    this.cameraTo(this.overview().add(f), v(0, 0.86, 0).add(f), duration, 40);
  }
  private deskCamera() {
    this.cameraTo(v(0.92, 1.4, -1.0), v(0.91, 1.2, -1.94), 0.78, 58);
  }
  private frameSurface(id: "computer" | "tv" | "resume" | "books" | "board") {
    const display = this.node("Display"),
      rotation = display.rotation.z,
      height = display.position.y;
    if (id === "computer") {
      display.rotation.z = this.portrait ? -Math.PI / 2 : 0;
      display.position.y = this.portrait ? 0.505 : 0.395;
    }
    const spec = this.surfaceSpec(id);
    if (id === "computer" && this.portrait)
      [spec.width, spec.height] = [spec.height, spec.width];
    const o = spec.source;
    o.updateWorldMatrix(true, false);
    const center = o.localToWorld(spec.offset.clone());
    const q = o
      .getWorldQuaternion(new T.Quaternion())
      .multiply(new T.Quaternion().setFromEuler(spec.rotation));
    const normal = v(0, 0, 1).applyQuaternion(q);
    display.rotation.z = rotation;
    display.position.y = height;
    const fov = 44,
      dist =
        Math.max(
          spec.height / 2 / Math.tan(T.MathUtils.degToRad(fov / 2)),
          spec.width /
            2 /
            Math.tan(T.MathUtils.degToRad(fov / 2)) /
            this.camera.aspect,
        ) * 1.12;
    this.cameraTo(
      center.clone().addScaledVector(normal, dist),
      center,
      0.65,
      fov,
    );
  }
  private play(
    duration: number,
    label: string,
    update: Action["update"],
    finish?: () => void,
  ) {
    this.notify({ busy: true, label });
    this.action = {
      duration,
      update,
      elapsed: 0,
      finish: () => {
        this.action = null;
        this.gaze = null;
        this.notify({ busy: false });
        finish?.();
        if (this.queueBack) {
          this.queueBack = false;
          this.back();
        }
      },
    };
  }
  visit(id: Spot) {
    if (!this.state.ready) return;
    if (this.state.busy) return;
    if (this.state.view === "dream") {
      this.wake();
      return;
    }
    if (this.state.view === "desk") {
      if (id === "computer") {
        this.notify({
          view: "computer",
          label: "A small computer. A lot of ideas.",
        });
        this.frameSurface("computer");
        this.discover(id);
        return;
      }
      if (id === "mug") {
        this.discover(id);
        this.drink();
        return;
      }
      if (id === "resume") {
        this.discover(id);
        this.readPaper();
        return;
      }
      if (id === "board") {
        this.notify({ view: "board", label: "Ideas, still taking shape." });
        this.frameSurface("board");
        this.discover(id);
        return;
      }
      this.exitDesk(() => this.visit(id));
      return;
    }
    if (this.state.view !== "room") {
      this.back();
      return;
    }
    this.path = findPath(this.actor.root.position, SPOTS[id].point);
    if (!this.path.length) {
      this.notify({ label: "Walk a little closer to the open aisle." });
      return;
    }
    this.pending = id;
    this.notify({ label: SPOTS[id].verb, focus: id });
  }
  private discover(id: Spot) {
    if (!this.state.visited.includes(id))
      this.notify({ visited: [...this.state.visited, id] });
  }
  private arrive(id: Spot) {
    this.gaze = v(...SPOTS[id].anchor);
    this.pending = null;
    this.speed = 0;
    this.actor.resetGait();
    this.discover(id);
    if (["computer", "mug", "resume", "board"].includes(id)) {
      this.enterDesk(id);
      return;
    }
    if (id === "bed") {
      this.sleep();
      return;
    }
    if (id === "tv") {
      this.sitTV();
      return;
    }
    if (id === "books" || id === "figure") {
      this.inspect(id);
      return;
    }
    if (id === "plant") {
      this.waterPlant();
      return;
    }
    if (id === "frames") {
      this.notify({
        view: "frames",
        label: "A few places I’d like to get lost in.",
      });
      this.cameraTo(v(-0.9, 2.05, 0.6), v(-2.73, 2.08, -0.43), 0.75, 56);
      return;
    }
    this.littleAction(id);
  }
  private enterDesk(after: Spot) {
    const a = this.actor,
      chair = this.node("Chair"),
      start = a.root.position.clone(),
      yaw = a.root.rotation.y;
    this.cameraTo(v(3.45, 2.45, 1.18), v(0.77, 0.88, -1.06), 0.65, 46);
    this.play(
      3.65,
      "Pulling up a chair…",
      (t, dt) => {
        a.root.rotation.set(0, angle(yaw, Math.PI / 2, between(t, 0, 0.24)), 0);
        const approach = between(t, 0, 0.28),
          pull = between(t, 0.22, 1.02);
        a.root.position.copy(start).lerp(v(0.36, 0, -0.85), approach);
        a.root.position.lerp(v(0.47, 0, -0.28), pull);
        chair.position.z = T.MathUtils.lerp(-1.18, -0.65, pull);
        chair.rotation.y = (pull * Math.PI) / 2;
        const step = between(t, 0.93, 1.43);
        a.root.position.lerp(v(0.45, 0, -0.65), step);
        a.root.rotation.y = angle(a.root.rotation.y, Math.PI * 1.5, step);
        if (t < 1.4) a.walk(dt, 1.1);
        const contact = between(t, 0.05, 0.25) * (1 - between(t, 0.85, 1.15));
        if (contact > 0) {
          const hand = chair.localToWorld(v(-0.24, 0.67, 0));
          a.hand(1, hand, contact);
          a.grip[1] = contact * 0.6;
        } else a.grip[1] = 0;
        const sit = between(t, 1.38, 2.03);
        if (t >= 1.38) {
          a.root.position.set(T.MathUtils.lerp(0.45, 0.92, sit), 0, -0.65);
          a.root.rotation.y = Math.PI * 1.5;
          a.pelvis.position.y = T.MathUtils.lerp(0.76, 0.565, sit);
          a.spine.rotation.x = Math.sin(sit * Math.PI) * 0.23 - 0.03;
          for (let i = 0; i < 2; i++)
            a.foot(i, v(0.48, 0.11, -0.65 + (i ? 0.1 : -0.1)));
          a.arms.forEach((arm) => (arm.rotation.x = -0.18));
          a.elbows.forEach((el) => (el.rotation.x = -0.38));
        }
        const swivel = between(t, 2.0, 2.7);
        if (t >= 2.0) {
          chair.rotation.y = ((1 - swivel) * Math.PI) / 2;
          chair.position.z = T.MathUtils.lerp(-0.65, -1.31, swivel);
          a.root.position.set(0.92, 0, chair.position.z);
          a.sit(chair.position, chair.rotation.y + Math.PI);
          this.restHands();
        }
        if (t >= 2.77 && !a["model"].userData.deskLens) {
          a.model.userData.deskLens = true;
          this.deskCamera();
          a.setFirstPerson(true);
        }
      },
      () => {
        a.model.userData.deskLens = false;
        this.notify({ view: "desk", label: "Your desk. Take your time." });
        if (after !== "computer") this.visit(after);
      },
    );
  }
  private restHands() {
    const a = this.actor;
    a.hand(0, a.root.localToWorld(v(-0.19, 0.62, 0.22)));
    a.hand(1, a.root.localToWorld(v(0.19, 0.62, 0.22)));
  }
  private seated() {
    const chair = this.node("Chair");
    this.actor.root.position.copy(chair.position);
    this.actor.sit(chair.position, chair.rotation.y + Math.PI);
    this.restHands();
  }
  private exitDesk(then?: () => void) {
    this.surfaces.show(null);
    this.actor.setFirstPerson(false);
    this.cameraTo(v(3.5, 2.5, 1.5), v(0.77, 0.85, -0.95), 0.55, 46);
    const a = this.actor,
      chair = this.node("Chair");
    this.play(
      2.65,
      "Back to the room.",
      (t, dt) => {
        const roll = between(t, 0, 0.58);
        chair.position.z = T.MathUtils.lerp(-1.31, -0.65, roll);
        chair.rotation.y = (between(t, 0.35, 0.95) * Math.PI) / 2;
        this.seated();
        const stand = between(t, 0.94, 1.67);
        if (t >= 0.94) {
          a.root.position.set(T.MathUtils.lerp(0.92, 0.44, stand), 0, -0.65);
          a.root.rotation.y = Math.PI * 1.5;
          a.pelvis.position.y = T.MathUtils.lerp(0.565, 0.76, stand);
          a.spine.rotation.x = Math.sin(stand * Math.PI) * 0.22;
          for (let i = 0; i < 2; i++)
            a.foot(i, v(0.46, 0.11, -0.65 + (i ? 0.1 : -0.1)));
        }
        if (t > 1.67) {
          const p = between(t, 1.67, 2.35);
          a.root.position.lerp(v(0.2, 0, -0.86), p);
          a.root.rotation.y = angle(Math.PI * 1.5, Math.PI / 2, p);
          a.walk(dt, 0.65);
          const returnChair = between(t, 1.8, 2.55);
          chair.position.z = T.MathUtils.lerp(-0.65, -1.18, returnChair);
          chair.rotation.y = ((1 - returnChair) * Math.PI) / 2;
          const w = Math.sin(returnChair * Math.PI);
          a.hand(1, chair.localToWorld(v(-0.24, 0.67, 0)), w);
        }
      },
      () => {
        a.resetGait();
        this.notify({ view: "room", label: "Make yourself at home." });
        this.roomCamera();
        then?.();
      },
    );
  }
  private attach(o: T.Object3D, side: number) {
    o.updateWorldMatrix(true, true);
    const p = o.position.clone(),
      q = o.quaternion.clone(),
      parent = o.parent!;
    const worldQ = o.getWorldQuaternion(new T.Quaternion());
    this.actor.hands[side].attach(o);
    this.hold = {
      side,
      object: o,
      parent,
      p,
      q,
      relative: this.actor.hands[side]
        .getWorldQuaternion(new T.Quaternion())
        .invert()
        .multiply(worldQ),
      offset: o.position.clone(),
      target: o.getWorldPosition(v()),
      rotation: worldQ.clone(),
    };
  }
  private heldAt(side: number, p: T.Vector3, q: T.Quaternion) {
    if (!this.hold) return;
    this.hold.target.copy(p);
    this.hold.rotation.copy(q);
    const a = this.actor;
    const handQ = q.clone().multiply(this.hold.relative.clone().invert());
    const wrist = p
      .clone()
      .sub(this.hold.offset.clone().applyQuaternion(handQ));
    a.hand(side, wrist);
    a.hands[side].quaternion.copy(
      a.elbows[side]
        .getWorldQuaternion(new T.Quaternion())
        .invert()
        .multiply(handQ),
    );
    a.hands[side].updateWorldMatrix(false, true);
  }
  private detach() {
    if (!this.hold) return;
    const h = this.hold;
    h.parent.attach(h.object);
    h.object.position.copy(h.p);
    h.object.quaternion.copy(h.q);
    this.hold = null;
    this.actor.grip = [0, 0];
  }
  private drink() {
    this.cameraTo(v(0.92, 1.4, -1), v(0.91, 1.04, -1.94), 0.3, 58);
    const mug = this.node("Mug"),
      from = mug.getWorldPosition(v()),
      q = mug.getWorldQuaternion(new T.Quaternion());
    let attached = false;
    this.play(
      2.8,
      "A little coffee break.",
      (t) => {
        this.seated();
        const reach = between(t, 0, 0.36);
        this.actor.spine.rotation.x = reach * 0.06;
        const wrist = from.clone().add(v(0.079, 0.058, 0));
        this.actor.hand(0, wrist, reach);
        this.actor.grip[0] = between(t, 0.22, 0.43) * 0.84;
        if (t >= 0.38 && !attached) {
          this.attach(mug, 0);
          attached = true;
        }
        if (attached && t < 2.42) {
          const lift = between(t, 0.4, 0.97) * (1 - between(t, 1.8, 2.4));
          const p = arc(from, v(0.92, 1.015, -1.48), lift, 0.075);
          const tilt = between(t, 0.95, 1.24) * (1 - between(t, 1.5, 1.86));
          const rotation = q
            .clone()
            .multiply(
              new T.Quaternion().setFromAxisAngle(v(1, 0, 0), tilt * 0.55),
            );
          this.heldAt(0, p, rotation);
          this.actor.head.rotation.x = tilt * 0.055;
        }
        if (t >= 2.42 && this.hold) this.detach();
        if (t >= 2.42) {
          this.actor.hand(0, wrist, 1 - between(t, 2.42, 2.8));
          this.actor.grip[0] = 0;
        }
      },
      () => {
        this.detach();
        this.bump(mug, 0.12);
        this.emote("☕");
        this.notify({ label: "That’s better." });
        this.deskCamera();
      },
    );
  }
  private readPaper() {
    const o = this.node("Paper"),
      p = o.getWorldPosition(v()),
      q = o.getWorldQuaternion(new T.Quaternion());
    let attached = false;
    this.play(
      1.1,
      "Something about me.",
      (t) => {
        this.seated();
        this.actor.pelvis.position.x = -0.08;
        this.actor.spine.rotation.x = 0.13;
        const wrist = p.clone().add(v(0.1, 0.015, 0.06));
        this.actor.hand(1, wrist, between(t, 0, 0.35));
        this.actor.grip[1] = between(t, 0.2, 0.4) * 0.55;
        if (t >= 0.38 && !attached) {
          this.attach(o, 1);
          attached = true;
        }
        if (attached) {
          const s = between(t, 0.38, 0.96);
          this.heldAt(
            1,
            arc(p, v(0.7, 0.99, -1.64), s, 0.055),
            q
              .clone()
              .slerp(
                new T.Quaternion().setFromEuler(new T.Euler(0.8, 0, 0.1)),
                s,
              ),
          );
        }
      },
      () => {
        this.notify({ view: "resume", label: "Sehal, on paper." });
        this.frameSurface("resume");
      },
    );
  }
  private returnPaper() {
    const h = this.hold;
    if (!h) {
      this.notify({ view: "desk" });
      this.deskCamera();
      return;
    }
    const from = h.object.getWorldPosition(v()),
      q = h.object.getWorldQuaternion(new T.Quaternion()),
      to = h.parent.localToWorld(h.p.clone());
    this.surfaces.show(null);
    this.play(
      0.82,
      "Back on the desk.",
      (t) => {
        this.seated();
        this.actor.pelvis.position.x = -0.08;
        this.actor.spine.rotation.x = 0.13;
        this.heldAt(
          1,
          arc(from, to, between(t, 0, 0.65), 0.04),
          q.clone().slerp(h.q, between(t, 0, 0.65)),
        );
        if (t > 0.66) {
          this.detach();
        }
      },
      () => {
        this.detach();
        this.notify({ view: "desk" });
        this.deskCamera();
      },
    );
  }
  private sleep() {
    const a = this.actor,
      start = a.root.position.clone(),
      yaw = a.root.rotation.y;
    let lens = false;
    this.cameraTo(v(1.65, 2.45, 2.15), v(-1.5, 0.75, -0.9), 0.65, 48);
    this.play(
      4.25,
      "The world can wait a moment.",
      (t) => {
        const sit = between(t, 0.12, 0.85);
        a.root.position.copy(start).lerp(v(-1.15, 0, -0.44), sit);
        a.root.rotation.set(0, angle(yaw, Math.PI / 2, between(t, 0, 0.35)), 0);
        a.pelvis.position.y = T.MathUtils.lerp(0.76, 0.61, sit);
        a.spine.rotation.x = -0.08 * Math.sin(sit * Math.PI);
        // Facing out into the aisle: feet stay beside the bed during the sit.
        for (let i = 0; i < 2; i++)
          a.foot(i, v(-0.82, 0.11, -0.44 + (i ? 0.1 : -0.1)));
        a.hand(0, v(-1.28, 0.61, -0.27), sit * 0.8);
        a.hand(1, v(-1.28, 0.61, -0.67), sit * 0.8);
        const lift = between(t, 0.72, 1.42),
          turn = between(t, 1.3, 2.08),
          lie = between(t, 2.02, 2.8);
        this.quilt(lift * (1 - between(t, 2.65, 3.32)), between(t, 2.15, 2.65));
        if (t >= 0.72) {
          a.root.position.x = T.MathUtils.lerp(-1.15, -1.91, turn);
          a.root.position.z = T.MathUtils.lerp(-0.44, -0.6, turn);
          a.root.position.y = T.MathUtils.lerp(0, 0.7, lie);
          a.root.rotation.set(
            (-Math.PI / 2) * lie,
            angle(Math.PI / 2, 0, turn),
            0,
          );
          a.pelvis.position.y = T.MathUtils.lerp(0.61, 0.76, lie);
          for (let i = 0; i < 2; i++) {
            const startFoot = v(-0.82, 0.11, -0.44 + (i ? 0.1 : -0.1));
            const lifted = v(-1.17, 0.91, -0.33 + (i ? 0.1 : -0.1));
            const over = v(-1.91 + (i ? 0.1 : -0.1), 0.79, -0.2);
            const target = startFoot.lerp(lifted, lift).lerp(over, turn);
            a.foot(i, target, 1 - lie);
            if (lie > 0) {
              for (const joint of [a.legs[i], a.knees[i], a.feet[i]])
                joint.quaternion.slerp(new T.Quaternion(), lie);
            }
          }
          a.arms.forEach((arm, i) => {
            arm.rotation.x = -0.14;
            arm.rotation.z = (i ? 1 : -1) * 0.12;
          });
          a.elbows.forEach((e) => (e.rotation.x = -0.25));
        }
        if (t >= 0.72 && t < 3.32) {
          const open = lift * (1 - between(t, 2.65, 3.32));
          const side = t < 2.02 ? 1 : 0;
          const w = between(t, 0.72, 1.0) * (1 - between(t, 3.1, 3.32));
          a.hand(
            side,
            v(
              T.MathUtils.lerp(-1.3, -2.37, open),
              T.MathUtils.lerp(0.65, 0.86, lie),
              T.MathUtils.lerp(-0.63, -1.4, lie),
            ),
            w,
          );
          a.grip[side] = w * 0.45;
        }
        if (t >= 2.85) {
          for (const joint of [...a.legs, ...a.knees, ...a.feet])
            joint.quaternion.identity();
          a.closedEyes = true;
          this.bubble.visible = true;
          this.bubble.scale.setScalar(between(t, 2.85, 3.55) * 0.47);
          this.bubble.position.set(-1.88, 1.4, -1.86);
          this.bubble.material.opacity = between(t, 2.85, 3.45);
        }
        if (t >= 3.33) {
          this.sleeping();
          a.grip = [0, 0];
        }
        if (t >= 3.1 && !lens) {
          lens = true;
          this.cameraTo(v(-0.2, 2.5, 0.85), v(-1.75, 0.95, -1.25), 0.9, 43);
        }
      },
      () => {
        this.notify({
          view: "sleep",
          label: "Somewhere between here and a dream.",
        });
        this.dreamPhase = 0;
      },
    );
  }
  private sleeping() {
    this.actor.closedEyes = true;
    this.actor.root.position.set(-1.91, 0.7, -0.6);
    this.actor.root.rotation.set(-Math.PI / 2, 0, 0);
    this.actor.arms.forEach((arm, i) => {
      arm.rotation.x = 0;
      arm.rotation.z = (i ? 1 : -1) * 0.08;
    });
    [...this.actor.legs, ...this.actor.knees, ...this.actor.feet].forEach((j) =>
      j.quaternion.identity(),
    );
    this.actor.elbows.forEach((e) => (e.rotation.x = -0.1));
    this.quilt(0, 1);
  }
  private quilt(lift: number, sleep: number) {
    const m = this.node("Quilt") as T.Mesh;
    if (m.morphTargetInfluences) {
      m.morphTargetInfluences[m.morphTargetDictionary!.Lift] = lift;
      m.morphTargetInfluences[m.morphTargetDictionary!.Sleep] = sleep;
    }
  }
  private enterDream() {
    this.play(
      1.0,
      "Somewhere else.",
      (t) => {
        this.sleeping();
        this.fade(between(t, 0, 0.45) * (1 - between(t, 0.52, 1)));
        if (t > 0.48 && !this.dream.visible) {
          this.room.visible = false;
          this.actor.root.visible = false;
          this.bubble.visible = false;
          this.dream.visible = true;
          this.scene.background = new T.Color("#202941");
          this.camera.position.set(0, 2.3, 6);
          this.lensTarget.set(0, 0.6, 0);
          this.camera.lookAt(this.lensTarget);
          this.lens = null;
        }
      },
      () => {
        this.fade(0);
        this.notify({
          view: "dream",
          label: "Even the quiet ideas go somewhere.",
        });
      },
    );
  }
  wake() {
    if (this.state.busy) {
      this.queueBack = true;
      return;
    }
    const fromDream = this.state.view === "dream";
    this.bubble.visible = false;
    this.play(
      3.0,
      "One more day, full of possibilities.",
      (t, dt) => {
        if (fromDream) {
          this.fade(
            t < 0.36 ? between(t, 0, 0.28) : 1 - between(t, 0.38, 0.76),
          );
          if (t > 0.3 && this.dream.visible) {
            this.dream.visible = false;
            this.room.visible = true;
            this.actor.root.visible = true;
            this.scene.background = new T.Color(
              this.state.night ? "#333a48" : "#ecdfc9",
            );
            this.camera.position.set(0.5, 2.6, 2.1);
            this.lensTarget.set(-1.5, 0.8, -0.8);
            this.lens = null;
          }
        }
        const a = this.actor,
          sit = between(t, 0.45, 1.28),
          turn = between(t, 1.16, 1.86),
          stand = between(t, 1.83, 2.55);
        a.root.rotation.set(
          (-Math.PI / 2) * (1 - sit),
          (Math.PI / 2) * turn,
          0,
        );
        a.root.position.set(
          T.MathUtils.lerp(-1.91, -1.15, turn),
          0.7 * (1 - sit),
          T.MathUtils.lerp(-0.6, -0.44, turn),
        );
        a.pelvis.position.y = T.MathUtils.lerp(0.76, 0.61, sit);
        this.quilt(
          between(t, 0.3, 0.75) * (1 - between(t, 1.45, 1.95)),
          1 - between(t, 0.4, 1.0),
        );
        if (sit > 0)
          for (let i = 0; i < 2; i++)
            a.foot(
              i,
              v(-1.91 + (i ? 0.1 : -0.1), 0.8, 0.13).lerp(
                v(-0.82, 0.11, -0.44 + (i ? 0.1 : -0.1)),
                turn,
              ),
              sit,
            );
        if (stand > 0) {
          a.root.position.x = T.MathUtils.lerp(-1.15, -0.88, stand);
          a.pelvis.position.y = T.MathUtils.lerp(0.61, 0.76, stand);
          a.spine.rotation.x = Math.sin(stand * Math.PI) * 0.2;
        }
        if (t > 2.55) {
          a.root.position.x = -0.88;
          a.walk(dt, 0);
        }
      },
      () => {
        this.fade(0);
        this.actor.resetGait();
        this.notify({ view: "room", label: "Welcome back." });
        this.roomCamera();
      },
    );
  }
  private sitTV() {
    const a = this.actor,
      from = a.root.position.clone(),
      yaw = a.root.rotation.y,
      seat = v(1.4, 0, 1.67),
      pad = this.node("Controller"),
      padP = pad.getWorldPosition(v()),
      padQ = pad.getWorldQuaternion(new T.Quaternion());
    let camera = false,
      attached = false;
    this.cameraTo(v(3.9, 2.8, 4.2), v(1.63, 0.72, 0.96), 0.6, 43);
    this.play(
      3.25,
      "One more game.",
      (t, dt) => {
        a.root.rotation.y = angle(yaw, Math.PI / 2, between(t, 0, 0.3));
        a.root.position.copy(from);
        const bend = between(t, 0, 0.3) * (1 - between(t, 0.6, 0.98));
        a.pelvis.position.y -= 0.2 * bend;
        a.spine.rotation.x = 0.18 * bend;
        if (t < 0.7)
          a.hand(1, padP.clone().add(v(-0.065, 0.025, 0)), between(t, 0, 0.38));
        if (t >= 0.42 && !attached) {
          this.attach(pad, 1);
          attached = true;
        }
        const move = between(t, 0.8, 1.52);
        a.root.position.lerp(v(1.7, 0, 1.11), move);
        a.root.rotation.y = angle(a.root.rotation.y, Math.PI - 0.65, move);
        if (t > 0.8 && t < 1.54) a.walk(dt, 0.85);
        const s = between(t, 1.48, 2.18);
        if (t >= 1.48) {
          a.root.position.lerp(seat, s);
          a.sit(a.root.position, Math.PI - 0.65, s, 0.52, 0.44);
        }
        if (attached) {
          const goal = this.controllerPose();
          const f = between(t, 0.44, 0.88);
          this.heldAt(
            1,
            arc(padP, goal.p, f, 0.05),
            padQ.clone().slerp(goal.q, f),
          );
          this.secondControllerHand(f);
          a.grip = [f * 0.68, 0.68];
        }
        if (t > 2.4 && !camera) {
          camera = true;
          this.frameSurface("tv");
          a.setFirstPerson(true);
        }
      },
      () => {
        this.emote("🎮");
        this.notify({
          view: "tv",
          label: "Choose a channel. Stay for a game.",
        });
      },
    );
  }
  private controllerPose() {
    return {
      p: this.actor.root.localToWorld(v(0, 0.79, 0.27)),
      q: this.actor.root
        .getWorldQuaternion(new T.Quaternion())
        .multiply(
          new T.Quaternion().setFromEuler(new T.Euler(-0.2, Math.PI, 0)),
        ),
    };
  }
  private secondControllerHand(weight = 1) {
    if (this.hold)
      this.actor.hand(
        0,
        this.hold.object.localToWorld(v(0.07, 0.015, 0)),
        weight,
      );
  }
  private exitTV() {
    const a = this.actor,
      h = this.hold;
    this.roomCamera();
    this.play(
      3.05,
      "Back to the room.",
      (t, dt) => {
        a.root.position
          .set(1.4, 0, 1.67)
          .lerp(v(1.7, 0, 1.11), between(t, 0, 0.75));
        a.sit(
          a.root.position,
          Math.PI - 0.65,
          1 - between(t, 0, 0.7),
          0.52,
          0.44,
        );
        if (t > 0.75) {
          a.root.position.lerp(v(1.7, 0, 0.62), between(t, 0.75, 1.45));
          a.root.rotation.y = angle(
            Math.PI - 0.65,
            Math.PI / 2,
            between(t, 0.75, 1.45),
          );
          a.walk(dt, 0.8);
        }
        if (h && this.hold) {
          const goal = this.controllerPose(),
            f = between(t, 1.45, 2.12),
            to = h.parent.localToWorld(h.p.clone());
          a.pelvis.position.y -= 0.2 * f;
          a.spine.rotation.x = 0.18 * f;
          this.heldAt(
            1,
            arc(goal.p, to, f, 0.05),
            goal.q.clone().slerp(h.q, f),
          );
          this.secondControllerHand(1 - f);
        }
        if (t > 2.16 && this.hold) this.detach();
        if (t > 2.16) {
          a.root.position.lerp(v(0.94, 0, 0.76), between(t, 2.16, 3.05));
          a.root.rotation.y = angle(
            Math.PI / 2,
            -Math.PI / 2,
            between(t, 2.16, 2.65),
          );
          a.walk(dt, 1);
        }
      },
      () => {
        this.detach();
        this.notify({ view: "room", label: "Make yourself at home." });
        a.resetGait();
      },
    );
  }
  private waterPlant() {
    const a = this.actor,
      can = this.node("WateringCan"),
      from = can.getWorldPosition(v()),
      q = can.getWorldQuaternion(new T.Quaternion()),
      yaw = a.root.rotation.y;
    let attached = false;
    const drops = Array.from({ length: 5 }, () => {
      const mesh = new T.Mesh(
        new T.SphereGeometry(0.008, 8, 6),
        new T.MeshBasicMaterial({ color: "#9dcede" }),
      );
      mesh.scale.y = 1.8;
      mesh.visible = false;
      this.scene.add(mesh);
      return mesh;
    });
    this.cameraTo(v(0.05, 2.05, 3.6), v(-2.05, 0.95, 1.88), 0.65, 43);
    this.play(
      2.9,
      "A little care goes a long way.",
      (t) => {
        a.root.rotation.y = angle(yaw, -Math.PI / 2, between(t, 0, 0.25));
        const lift = between(t, 0.42, 0.94) * (1 - between(t, 1.88, 2.46));
        const reach = between(t, 0, 0.34);
        a.pelvis.position.y -= 0.14 * reach * (1 - lift);
        a.spine.position.z = 0.1 * reach * (1 - lift) + 0.065 * lift;
        a.hand(1, from.clone().add(v(0.086, 0.08, 0)), reach);
        a.grip[1] = between(t, 0.22, 0.4) * 0.75;
        if (t >= 0.38 && !attached) {
          this.attach(can, 1);
          attached = true;
        }
        if (attached && this.hold) {
          const tilt = between(t, 0.88, 1.15) * (1 - between(t, 1.7, 1.94));
          this.heldAt(
            1,
            arc(from, v(-2.22, 0.96, 2.01), lift, 0.07),
            q
              .clone()
              .multiply(
                new T.Quaternion().setFromAxisAngle(v(0, 0, 1), tilt * 0.52),
              ),
          );
          const tip = can.localToWorld(v(-0.197, 0.151, 0));
          drops.forEach((drop, i) => {
            drop.visible = tilt > 0.5;
            const f = (t * 3 + i / 5) % 1;
            drop.position
              .copy(tip)
              .add(v(-0.015 * f, -f * 0.23, Math.sin(i) * 0.009));
          });
        }
        if (t > 2.5) {
          if (this.hold) this.detach();
          a.hand(
            1,
            from.clone().add(v(0.086, 0.08, 0)),
            1 - between(t, 2.5, 2.9),
          );
        }
      },
      () => {
        this.detach();
        drops.forEach((d) => {
          d.removeFromParent();
          d.geometry.dispose();
          (d.material as T.Material).dispose();
        });
        this.bump(this.node("CarePlant"), 0.16);
        this.emote("🌱");
        this.roomCamera();
        this.notify({ label: "A happy little plant." });
      },
    );
  }
  private inspect(id: "books" | "figure") {
    const a = this.actor,
      o = this.node(id === "books" ? "Notebook" : "Figure"),
      from = o.getWorldPosition(v()),
      q = o.getWorldQuaternion(new T.Quaternion()),
      side = id === "books" ? 1 : 0;
    let attached = false;
    const target =
      id === "books" ? v(-0.54, 1.05, -1.48) : v(2.08, 1.18, -1.82);
    const facing = id === "books" ? -1.78 : Math.PI;
    this.play(
      1.1,
      SPOTS[id].verb,
      (t) => {
        a.root.rotation.y = angle(
          a.root.rotation.y,
          facing,
          between(t, 0, 0.35),
        );
        const bend =
          id === "books"
            ? between(t, 0, 0.25) * (1 - between(t, 0.5, 1.05))
            : 0;
        a.spine.position.z = bend * 0.19;
        a.pelvis.position.y -= bend * 0.14;
        a.spine.rotation.x = bend * 0.12;
        const wrist = from
          .clone()
          .add(v(id === "books" ? 0.1 : 0.055, 0.025, 0.02));
        a.hand(side, wrist, between(t, 0, 0.38));
        a.grip[side] = between(t, 0.28, 0.45) * 0.65;
        if (t >= 0.4 && !attached) {
          this.attach(o, side);
          attached = true;
          this.emote(id === "books" ? "✏️" : "🚀");
        }
        if (attached)
          this.heldAt(
            side,
            arc(from, target, between(t, 0.4, 1.05), 0.08),
            q
              .clone()
              .slerp(
                new T.Quaternion().setFromEuler(
                  new T.Euler(id === "books" ? 0.85 : 0, 0, 0),
                ),
                between(t, 0.4, 1.05),
              ),
          );
      },
      () => {
        this.notify({
          view: id,
          label:
            id === "books"
              ? "A place for stray thoughts."
              : "Small explorer. Big universe.",
        });
        a.setFirstPerson(true);
        if (id === "books") this.frameSurface("books");
        else this.cameraTo(v(2.1, 1.5, -1.15), v(2.08, 1.31, -1.84), 0.65, 50);
      },
    );
  }
  private littleAction(id: Spot) {
    const a = this.actor,
      fromYaw = a.root.rotation.y;
    const anchor = v(...SPOTS[id].anchor);
    if (id === "wardrobe") anchor.y = 1.0;
    const targetYaw = Math.atan2(
      anchor.x - a.root.position.x,
      anchor.z - a.root.position.z,
    );
    let toggled = false;
    const wardrobe = id === "wardrobe";
    this.play(
      wardrobe ? 1.7 : 0.95,
      SPOTS[id].verb,
      (t) => {
        a.root.rotation.y = angle(fromYaw, targetYaw, between(t, 0, 0.3));
        const hand = anchor.clone().setY(Math.min(1.2, anchor.y));
        const w = wardrobe
          ? between(t, 0.35, 0.65) * (1 - between(t, 0.85, 1.25))
          : between(t, 0.1, 0.38) * (1 - between(t, 0.61, 0.9));
        a.spine.position.z = w * 0.12;
        a.spine.rotation.x = w * 0.08;
        if (id === "window")
          hand.y -= Math.sin(between(t, 0.25, 0.8) * Math.PI) * 0.12;
        a.hand(0, hand, w);
        if (t > (wardrobe ? 0.7 : 0.46) && !toggled) {
          toggled = true;
          if (id === "lamp") {
            this.lampOn = !this.lampOn;
            this.bump(this.node("Lamp"), 0.09);
            this.emote(this.lampOn ? "💡" : "🌙");
          }
          if (id === "window") {
            this.curtain = 1 - this.curtain;
            this.emote(this.curtain ? "🌤️" : "☁️");
          }
          if (id === "wardrobe") {
            this.actor.model.traverse((o) => {
              if (o instanceof T.Mesh && o.name.includes("Burnt")) {
                const m = o.material as T.MeshStandardMaterial;
                m.color.set(["#507c79", "#b89a59", "#b86143"][this.jacket % 3]);
              }
            });
            this.jacket++;
            this.emote("✨");
          }
        }
        if (wardrobe) {
          // Doors swing past open, then thud shut with a little rebound.
          const w =
            back((t - 0.05) / 0.45, 2.2) * (1 - smoother((t - 1.0) / 0.38)) +
            (t > 1.38 ? wobble(t - 1.38, 4, 9) * 0.06 : 0);
          this.node("Door-1").rotation.y = -w * 0.7;
          this.node("Door1").rotation.y = w * 0.7;
          a.pelvis.position.y -= window01(t, 0.55, 0.95) * 0.05;
        }
      },
      () => {
        if (wardrobe) this.bump(this.node("Wardrobe"), 0.025);
        this.notify({
          label:
            id === "lamp"
              ? "A softer light."
              : id === "plant"
                ? "A little care goes a long way."
                : id === "wardrobe"
                  ? "Looking sharp."
                  : "Make yourself at home.",
        });
      },
    );
  }
  back() {
    if (this.state.busy) {
      this.queueBack = true;
      return;
    }
    this.surfaces.show(null);
    this.actor.setFirstPerson(false);
    this.path = [];
    this.pending = null;
    const view = this.state.view;
    if (view === "computer" || view === "board") {
      this.notify({ view: "desk", label: "Your desk." });
      this.actor.setFirstPerson(true);
      this.deskCamera();
    } else if (view === "resume") this.returnPaper();
    else if (view === "desk") this.exitDesk();
    else if (view === "sleep" || view === "dream") this.wake();
    else if (view === "tv") this.exitTV();
    else if (this.hold) {
      const h = this.hold,
        side = h.side,
        from = h.object.getWorldPosition(v()),
        q = h.object.getWorldQuaternion(new T.Quaternion()),
        to = h.parent.localToWorld(h.p.clone());
      this.roomCamera();
      this.play(
        1.2,
        "Back where it belongs.",
        (t) => {
          const bend =
            view === "books"
              ? between(t, 0, 0.6) * (1 - between(t, 0.88, 1.2))
              : 0;
          this.actor.spine.position.z = bend * 0.19;
          this.actor.pelvis.position.y -= bend * 0.14;
          this.actor.spine.rotation.x = bend * 0.12;
          if (t < 0.88)
            this.heldAt(
              side,
              arc(from, to, between(t, 0, 0.8), 0.05),
              q.clone().slerp(h.q, between(t, 0, 0.8)),
            );
          else if (this.hold) this.detach();
        },
        () => {
          const o = h.object;
          this.detach();
          this.bump(o, 0.1);
          this.notify({ view: "room" });
        },
      );
    } else {
      this.notify({ view: "room", label: "Make yourself at home." });
      this.roomCamera();
    }
  }
  setNight() {
    this.notify({ night: !this.state.night });
    if (this.state.view !== "dream")
      this.scene.background = new T.Color(
        this.state.night ? "#333a48" : "#ecdfc9",
      );
  }
  setPaused(value: boolean) {
    this.paused = value;
    this.keys.clear();
  }
  resetCamera() {
    this.yaw = 0.63;
    this.zoomTarget = 1;
    this.yawVelocity = 0;
    if (this.state.view === "room") this.roomCamera();
  }
  private surfaceSpec(id: SurfaceId) {
    const specs = {
      computer: {
        name: "ComputerSurface",
        width: 0.863,
        height: 0.485,
        rotation: new T.Euler(),
        offset: v(0, 0, 0.003),
      },
      tv: {
        name: "TVSurface",
        width: 1.018,
        height: 0.571,
        rotation: new T.Euler(),
        offset: v(0, 0, 0.004),
      },
      resume: {
        name: "Paper",
        width: 0.24,
        height: 0.33,
        rotation: new T.Euler(-Math.PI / 2, 0, 0),
        offset: v(0, 0.006, 0),
      },
      books: {
        name: "Notebook",
        width: 0.236,
        height: 0.159,
        rotation: new T.Euler(-Math.PI / 2, 0, 0),
        offset: v(0, 0.02, 0),
      },
      board: {
        name: "Board",
        width: 1.095,
        height: 0.543,
        rotation: new T.Euler(),
        offset: v(0, 0, 0.044),
      },
    };
    const s = specs[id];
    return { ...s, source: this.node(s.name) };
  }
  mountSurface(id: SurfaceId, element: HTMLElement) {
    this.surfaceElements.set(id, element);
    if (!this.room) return;
    const s = this.surfaceSpec(id);
    this.surfaces.mount(
      id,
      element,
      s.source,
      s.width,
      s.height,
      s.rotation,
      s.offset,
    );
  }
  private tick = (now: number) => {
    if (this.disposed) return;
    this.frame = requestAnimationFrame(this.tick);
    const dt = Math.min(0.04, (now - this.last) / 1000 || 0.016);
    this.last = now;
    // Pages over the room only block input; the room keeps living behind them.
    if (document.hidden) return;
    this.time += dt;
    const a = this.actor;
    a.reset(this.time);
    const view = this.state.view;
    if (this.action) {
      const action = this.action;
      action.elapsed = Math.min(action.duration, (action.elapsed ?? 0) + dt);
      action.update(action.elapsed, dt);
      if (action.elapsed >= action.duration) action.finish?.();
    } else if (view === "room") this.move(dt);
    else if (["desk", "computer", "resume", "board"].includes(view)) {
      this.seated();
      if (this.hold) {
        a.pelvis.position.x = -0.08;
        a.spine.rotation.x = 0.13;
        this.heldAt(1, this.hold.target, this.hold.rotation);
      }
    } else if (view === "sleep") {
      this.sleeping();
      this.dreamPhase += dt;
      if (this.dreamPhase > 1.35) this.enterDream();
    } else if (view === "tv") {
      a.root.position.set(1.4, 0, 1.67);
      a.sit(a.root.position, Math.PI - 0.65, 1, 0.52, 0.44);
      if (this.hold) {
        const pose = this.controllerPose();
        this.heldAt(1, pose.p, pose.q);
        this.secondControllerHand();
      }
    } else if (this.hold) {
      this.heldAt(this.hold.side, this.hold.target, this.hold.rotation);
    }
    if (this.lens) {
      const l = this.lens;
      l.t += dt;
      const t = smoother(l.t / l.duration);
      this.camera.position.copy(l.path.at(t));
      this.lensTarget.lerpVectors(l.from, l.to, t);
      this.camera.fov = T.MathUtils.lerp(l.fov, l.targetFov, t);
      if (t === 1) this.lens = null;
      this.camera.updateProjectionMatrix();
    } else if (this.state.view === "room" && !this.state.busy) {
      // Flick-to-orbit keeps its momentum; the cursor adds a little parallax
      // and the frame breathes so the room never sits perfectly still.
      if (!this.down?.drag) {
        this.yaw += this.yawVelocity * dt;
        this.yawVelocity *= Math.exp(-dt * 4.5);
      }
      const clamped = T.MathUtils.clamp(this.yaw, -0.1, 1.48);
      if (clamped !== this.yaw) {
        this.yaw = T.MathUtils.damp(this.yaw, clamped, 10, dt);
        this.yawVelocity = 0;
      }
      this.zoom = T.MathUtils.damp(this.zoom, this.zoomTarget, 7, dt);
      const px = this.parallax.x.step(this.reduced ? 0 : this.pointer.x, dt),
        py = this.parallax.y.step(this.reduced ? 0 : this.pointer.y, dt);
      const f = this.follow(),
        yaw = this.yaw;
      this.yaw += px * 0.04;
      const goal = this.overview().add(f);
      this.yaw = yaw;
      goal.y += py * 0.22 + Math.sin(this.time * 0.21) * 0.04;
      goal.x += Math.sin(this.time * 0.13) * 0.05;
      this.camera.position.lerp(goal, 1 - Math.exp(-dt * 4));
      this.lensTarget.lerp(v(0, 0.86, 0).add(f), 1 - Math.exp(-dt * 4));
    }
    this.viewShift = T.MathUtils.damp(
      this.viewShift,
      this.entered ? 0 : 1,
      5,
      dt,
    );
    this.camera.setViewOffset(
      this.host.clientWidth,
      this.host.clientHeight,
      this.portrait ? 0 : -this.host.clientWidth * 0.12 * this.viewShift,
      this.portrait ? this.host.clientHeight * 0.15 * this.viewShift : 0,
      this.host.clientWidth,
      this.host.clientHeight,
    );
    this.camera.lookAt(this.lensTarget);
    this.camera.updateMatrixWorld();
    a.updateLens(this.camera.position);
    a.lookTarget = this.lookTarget();
    a.life(dt, !this.action && view === "room" && !this.hold);
    a.sync();
    this.feel(dt);
    if (this.bubble.visible)
      this.bubble.position.y = 1.4 + Math.sin(this.time * 2) * 0.025;
    if (this.dream.visible) {
      this.stars.rotation.y += dt * 0.018;
      this.dream.children.forEach((o, i) => {
        if (o.userData.float)
          o.position.y = o.userData.y + Math.sin(this.time * 0.5 + i) * 0.1;
      });
    }
    for (const [n, s] of [
      ["Curtain-1", -1],
      ["Curtain1", 1],
    ] as const) {
      const o = this.nodes.get(n);
      if (o) {
        o.position.x = T.MathUtils.lerp(
          o.position.x,
          -1.45 + s * (this.curtain ? 0.38 : 0.73),
          1 - Math.exp(-dt * 4),
        );
        o.scale.x = T.MathUtils.damp(o.scale.x, this.curtain ? 2.05 : 1, 4, dt);
      }
    }
    const portraitScreen = this.portrait && this.state.view === "computer",
      display = this.node("Display");
    display.rotation.z = T.MathUtils.damp(
      display.rotation.z,
      portraitScreen ? -Math.PI / 2 : 0,
      9,
      dt,
    );
    display.position.y = T.MathUtils.damp(
      display.position.y,
      portraitScreen ? 0.505 : 0.395,
      9,
      dt,
    );
    const active = ["computer", "resume", "books", "board", "tv"].includes(
      this.state.view,
    )
      ? (this.state.view as SurfaceId)
      : null;
    this.surfaces.show(active, !this.state.busy && !this.lens);
    this.surfaces.render(this.camera, portraitScreen);
    this.renderer.info.reset();
    this.lighting.render(
      dt,
      this.state.night || this.dream.visible,
      a["model"].userData.deskLens ||
        ["desk", "computer", "resume", "tv", "books"].includes(this.state.view),
      this.lampOn,
    );
  };
  private move(dt: number) {
    const a = this.actor;
    let dx = 0,
      dz = 0;
    const old = a.root.position.clone();
    if (this.entered) {
      dx =
        (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) -
        (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0);
      dz =
        (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0) -
        (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0);
    }
    if (dx || dz) {
      this.path = [];
      this.pending = null;
      const dir = v(dx, 0, dz).normalize().applyAxisAngle(up, this.yaw);
      this.speed = Math.min(1.65, this.speed + dt * 7);
      const p = moveWithCollision(
        a.root.position,
        dir.x * this.speed * dt,
        dir.z * this.speed * dt,
      );
      a.root.position.set(p.x, 0, p.z);
    } else if (this.path.length) {
      const remaining = this.path.reduce(
        (sum, p, i) =>
          sum +
          Math.hypot(
            p.x - (i ? this.path[i - 1].x : a.root.position.x),
            p.z - (i ? this.path[i - 1].z : a.root.position.z),
          ),
        0,
      );
      const goal = Math.min(1.7, Math.sqrt(2 * 6 * remaining));
      this.speed = T.MathUtils.damp(this.speed, goal, 12, dt);
      const p = advancePath(
        a.root.position,
        this.path,
        Math.max(0.05, this.speed) * dt,
      );
      a.root.position.set(p.x, 0, p.z);
    } else this.speed = Math.max(0, this.speed - dt * 8);
    const delta = a.root.position.clone().sub(old);
    if (delta.lengthSq() > 0.000001)
      a.root.rotation.y = angle(
        a.root.rotation.y,
        Math.atan2(delta.x, delta.z),
        1 - Math.exp(-dt * 14),
      );
    a.walk(dt, delta.length() / dt);
    if (!this.path.length && this.pending) {
      this.arrive(this.pending);
      return;
    }
    if (!this.path.length) {
      let nearest: Spot | null = null,
        dist = 0.8;
      for (const id of Object.keys(SPOTS) as Spot[]) {
        const d = Math.hypot(
          a.root.position.x - SPOTS[id].point.x,
          a.root.position.z - SPOTS[id].point.z,
        );
        if (d < dist) {
          dist = d;
          nearest = id;
        }
      }
      if (nearest !== this.state.focus) this.notify({ focus: nearest });
    }
  }
  private pick(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      (-(e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObject(this.room, true);
    for (const hit of hits) {
      let o: T.Object3D | null = hit.object;
      while (o && o !== this.room) {
        const match = (Object.keys(SPOTS) as Spot[]).find(
          (id) => SPOTS[id].root === o!.name,
        );
        if (match) return match;
        o = o.parent;
      }
    }
    return null;
  }
  private events() {
    const on = <K extends keyof WindowEventMap>(
      target: Window | HTMLElement,
      name: K,
      fn: (e: WindowEventMap[K]) => void,
    ) => {
      target.addEventListener(name, fn as EventListener);
      this.cleanups.push(() =>
        target.removeEventListener(name, fn as EventListener),
      );
    };
    on(window, "keydown", (e) => {
      const key = e.key.toLowerCase();
      if (this.paused) return;
      if (
        key !== "escape" &&
        (e.target as HTMLElement).closest(
          'input,textarea,[contenteditable="true"]',
        )
      )
        return;
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          " ",
        ].includes(key)
      ) {
        e.preventDefault();
        this.keys.add(key);
      }
      if (!e.repeat && key === "e" && this.state.focus)
        this.visit(this.state.focus);
      if (!e.repeat && key === "escape") this.back();
    });
    on(window, "keyup", (e) => this.keys.delete(e.key.toLowerCase()));
    on(window, "blur", () => this.keys.clear());
    const c = this.renderer.domElement;
    on(c, "pointerdown", (e) => {
      if (!this.entered || !this.state.ready) return;
      this.down = { x: e.clientX, y: e.clientY, drag: false };
      c.setPointerCapture(e.pointerId);
    });
    on(c, "pointermove", (e) => {
      const rect = c.getBoundingClientRect();
      this.pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      this.pointerSeen = true;
      if (!this.entered || !this.state.ready) return;
      if (this.down && this.state.view === "room" && !this.state.busy) {
        const dx = e.clientX - this.down.x;
        if (Math.abs(dx) > 3) this.down.drag = true;
        if (this.down.drag) {
          const now = performance.now(),
            step = -dx * 0.004;
          this.yaw = T.MathUtils.clamp(this.yaw + step, -0.25, 1.63);
          this.yawVelocity =
            T.MathUtils.lerp(
              this.yawVelocity,
              step / Math.max(0.008, (now - this.lastDrag) / 1000),
              0.5,
            ) || 0;
          this.lastDrag = now;
          this.down.x = e.clientX;
          this.setHover(null, false);
        }
      } else {
        const id = this.pick(e);
        const actor = !id && this.hitsActor();
        this.setHover(id, actor);
        c.style.cursor = id || actor ? "pointer" : "grab";
      }
    });
    on(c, "pointerleave", () => {
      this.pointer.set(0, 0);
      this.setHover(null, false);
    });
    on(c, "pointerup", (e) => {
      if (!this.down) return;
      if (!this.down.drag) {
        this.yawVelocity = 0;
        const id = this.pick(e);
        if (id) {
          // Only hand-sized things squash on a tap; furniture stays solid.
          const o = this.node(SPOTS[id].root),
            size = new T.Box3().setFromObject(o).getSize(v());
          if (Math.max(size.x, size.y, size.z) < 0.9) this.bump(o, 0.06);
          this.visit(id);
        } else if (this.hitsActor()) this.poke();
        else if (this.state.view === "room" && !this.state.busy) {
          const p = this.raycaster.ray.intersectPlane(new T.Plane(up, 0), v());
          if (p && canStand(p)) {
            this.path = findPath(this.actor.root.position, p);
            this.pending = null;
            if (this.path.length) {
              this.ripple.position.set(p.x, 0.012, p.z);
              this.rippleTime = 0;
            }
          }
        }
      } else if (performance.now() - this.lastDrag > 80) this.yawVelocity = 0;
      this.down = null;
    });
    on(c, "wheel", (e) => {
      if (this.state.view === "room") {
        this.zoomTarget = T.MathUtils.clamp(
          this.zoomTarget + e.deltaY * 0.0007,
          0.74,
          1.35,
        );
      }
    });
  }
  // ---- Feel layer -------------------------------------------------------
  private prepareGlow() {
    const roots = new Map<string, Spot>();
    for (const id of Object.keys(SPOTS) as Spot[])
      if (!roots.has(SPOTS[id].root)) roots.set(SPOTS[id].root, id);
    for (const [name, id] of roots) {
      const materials: T.MeshStandardMaterial[] = [];
      this.nodes.get(name)?.traverse((o) => {
        if (!(o instanceof T.Mesh) || Array.isArray(o.material)) return;
        const m = o.material as T.MeshStandardMaterial;
        if (!m.isMeshStandardMaterial) return;
        // Per-object copies so a highlight never lights every oak surface.
        const copy = m.clone();
        copy.onBeforeCompile = m.onBeforeCompile;
        copy.customProgramCacheKey = m.customProgramCacheKey;
        copy.userData.emissive = m.emissive.clone();
        copy.userData.intensity = m.emissiveIntensity;
        o.material = copy;
        materials.push(copy);
      });
      this.glow.set(id, { spring: new Spring(0, 160, 18), materials });
    }
  }
  private setHover(id: Spot | null, actor: boolean) {
    const interactive =
      !this.state.busy &&
      (this.state.view === "room" || this.state.view === "desk");
    if (!interactive) ((id = null), (actor = false));
    if (id !== this.hover) {
      this.hover = id;
      if (id) {
        this.tag.innerHTML = `<b>${SPOTS[id].name}</b><span>${SPOTS[id].verb}</span>`;
        this.glow.get(id)?.spring.kick(4);
      }
    }
    if (actor && !this.hoverActor)
      this.tag.innerHTML = `<b>That’s me</b><span>Say hi</span>`;
    this.hoverActor = actor;
    this.tag.classList.toggle("is-on", !!id || actor);
  }
  private hitsActor() {
    if (this.state.view !== "room" || this.state.busy) return false;
    const r = this.actor.root.position;
    const d = this.raycaster.ray.distanceSqToSegment(
      v(r.x, 0.1, r.z),
      v(r.x, 1.65, r.z),
    );
    return d < 0.22 * 0.22;
  }
  private lookTarget(): T.Vector3 | null {
    const view = this.state.view;
    if (this.action) {
      if (this.hold) return this.hold.object.getWorldPosition(v());
      return this.gaze;
    }
    if (view !== "room") return null;
    if (this.hoverActor) return this.camera.position;
    if (this.hover) return v(...SPOTS[this.hover].anchor);
    if (this.pending) return v(...SPOTS[this.pending].anchor);
    if (this.state.focus) return v(...SPOTS[this.state.focus].anchor);
    if (this.time > this.glance.until) {
      // Idle curiosity: a glance at you, at something nearby, or nowhere.
      const roll = Math.random(),
        spots = Object.keys(SPOTS) as Spot[];
      this.glance = {
        target:
          roll < 0.3
            ? this.camera.position
            : roll < 0.75
              ? v(
                  ...SPOTS[spots[Math.floor(Math.random() * spots.length)]]
                    .anchor,
                )
              : null,
        until: this.time + 2.2 + Math.random() * 3.5,
      };
    }
    return this.speed > 0.4 ? null : this.glance.target;
  }
  private poke() {
    const a = this.actor,
      hop = this.pokes++ % 3 === 2,
      fromYaw = a.root.rotation.y,
      toCamera = Math.atan2(
        this.camera.position.x - a.root.position.x,
        this.camera.position.z - a.root.position.z,
      );
    this.path = [];
    this.pending = null;
    this.gaze = this.camera.position.clone();
    this.emote(hop ? "✨" : "👋");
    if (hop) {
      this.play(
        1.05,
        "Boing.",
        (t) => {
          a.root.rotation.y = angle(fromYaw, toCamera, easeOut(t / 0.3));
          const crouch =
            window01(t, 0, 0.36) * (t < 0.25 ? 1 : 0.6) +
            window01(t, 0.62, 0.9) * 0.8;
          const air =
            t > 0.26 && t < 0.66 ? Math.sin(((t - 0.26) / 0.4) * Math.PI) : 0;
          a.root.position.y = air * 0.2;
          a.pelvis.position.y -= crouch * 0.09 - air * 0.02;
          a.spine.rotation.x += crouch * 0.18;
          a.arms.forEach((arm, i) => {
            arm.rotation.x = -air * 0.5 + crouch * 0.4;
            arm.rotation.z += (i ? 1 : -1) * air * 0.6;
          });
          for (let i = 0; i < 2; i++)
            a.foot(
              i,
              a.root
                .localToWorld(v(i ? 0.1 : -0.1, 0.11, 0.02))
                .setY(0.11 + air * 0.14),
            );
        },
        () => {
          a.root.position.y = 0;
          a.resetGait();
        },
      );
      return;
    }
    this.play(1.75, "Oh, hi!", (t) => {
      a.root.rotation.y = angle(fromYaw, toCamera, easeOut(t / 0.35));
      const w = between(t, 0.1, 0.38) * (1 - between(t, 1.3, 1.7));
      const hand = a.root.localToWorld(
        v(0.4 + Math.sin(t * 15) * 0.07 * w, 1.46, 0.14),
      );
      a.hand(1, hand, w);
      a.head.rotation.z += Math.sin(t * 7.5) * 0.05 * w;
      a.spine.rotation.z += -0.05 * w;
      a.pelvis.position.y -= window01(t, 0, 0.3) * 0.02;
    });
  }
  emote(glyph: string) {
    let material = this.emoteCache.get(glyph);
    if (!material) {
      const c = document.createElement("canvas");
      c.width = c.height = 192;
      const x = c.getContext("2d")!;
      x.fillStyle = "#6b4a2a33";
      x.beginPath();
      x.arc(96, 102, 76, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = "#fff6e6";
      x.beginPath();
      x.arc(96, 94, 76, 0, Math.PI * 2);
      x.fill();
      x.font =
        '84px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.fillText(glyph, 96, 100);
      const tex = new T.CanvasTexture(c);
      tex.colorSpace = T.SRGBColorSpace;
      material = new T.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      this.emoteCache.set(glyph, material);
    }
    const sprite = new T.Sprite(material.clone());
    sprite.renderOrder = 10;
    sprite.scale.setScalar(0.001);
    this.scene.add(sprite);
    this.emotes.push({ sprite, t: 0 });
  }
  private bump(o: T.Object3D, strength: number) {
    if (this.reduced) return;
    const current = this.bumps.get(o);
    this.bumps.set(o, {
      base: current?.base ?? o.scale.clone(),
      t: 0,
      strength,
    });
  }
  private feel(dt: number) {
    // Hover glow: sprung so it swells in and eases out instead of blinking.
    for (const [id, g] of this.glow) {
      const on = this.hover === id ? 1 : 0;
      const k = Math.max(0, g.spring.step(on, dt));
      for (const m of g.materials) {
        if (k < 0.002) {
          m.emissive.copy(m.userData.emissive);
          m.emissiveIntensity = m.userData.intensity;
          continue;
        }
        m.emissive.set("#ffb873");
        m.emissiveIntensity = k * (0.2 + Math.sin(this.time * 4) * 0.04);
      }
    }
    // Tag trails the cursor on a short spring.
    if (this.pointerSeen) {
      const goal = new T.Vector2(
        ((this.pointer.x + 1) / 2) * this.host.clientWidth,
        ((1 - this.pointer.y) / 2) * this.host.clientHeight,
      );
      if (this.tagPos.x < -900) this.tagPos.copy(goal);
      this.tagPos.lerp(goal, 1 - Math.exp(-dt * 18));
      this.tag.style.transform = `translate3d(${this.tagPos.x + 18}px, ${this.tagPos.y + 14}px, 0)`;
    }
    if (this.rippleTime >= 0) {
      this.rippleTime += dt;
      const t = this.rippleTime / 0.65;
      this.ripple.visible = t < 1;
      this.ripple.scale.setScalar(0.6 + easeOut(t) * 2.4);
      (this.ripple.material as T.MeshBasicMaterial).opacity = (1 - t) * 0.85;
      if (t >= 1) this.rippleTime = -1;
    }
    const head = this.actor.head.getWorldPosition(v()),
      // Emotes keep a readable on-screen size from the overview and up close.
      size = T.MathUtils.clamp(
        head.distanceTo(this.camera.position) * 0.055,
        0.14,
        0.6,
      );
    this.emotes = this.emotes.filter((e, i) => {
      e.t += dt;
      const t = e.t / 1.9,
        m = e.sprite.material as T.SpriteMaterial;
      e.sprite.position
        .copy(head)
        .add(
          v(0, 0.25 + size * 0.6 + easeOut(t) * size * 0.8 + i * size * 0.4, 0),
        );
      e.sprite.scale.setScalar(back(e.t / 0.32, 2.4) * size);
      m.opacity = 1 - smoother((t - 0.7) / 0.3);
      m.rotation = Math.sin(e.t * 5) * 0.08 * (1 - t);
      if (t < 1) return true;
      e.sprite.removeFromParent();
      m.dispose();
      return false;
    });
    for (const [o, b] of this.bumps) {
      b.t += dt;
      const w = wobble(b.t, 2.4, 4.5) * b.strength;
      o.scale.set(
        b.base.x * (1 - w * 0.5),
        b.base.y * (1 + w),
        b.base.z * (1 - w * 0.5),
      );
      if (b.t > 1.4) {
        o.scale.copy(b.base);
        this.bumps.delete(o);
      }
    }
  }
  private resize() {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    this.portrait = w / h < 0.85;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.lighting.resize(w, h);
    this.surfaces.resize(w, h);
    if (
      this.room &&
      ["computer", "tv", "resume", "books", "board"].includes(this.state.view)
    )
      this.frameSurface(this.state.view as SurfaceId);
  }
  private paintScreen(name: string, tv: boolean) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 576;
    const c = canvas.getContext("2d")!;
    c.fillStyle = tv ? "#152c3b" : "#377c80";
    c.fillRect(0, 0, 1024, 576);
    c.fillStyle = tv ? "#dfac64" : "#a7c5ad";
    c.beginPath();
    c.arc(820, 110, 200, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = tv ? "#be6752" : "#e9d2a4";
    c.beginPath();
    c.ellipse(100, 520, 700, 200, -0.35, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#fff1d5";
    c.font = "500 24px sans-serif";
    c.fillText(
      tv
        ? "SEHAL TV / CHANNEL 01"
        : "sehalOS                                      Wednesday, at home",
      38,
      44,
    );
    c.font = "64px Georgia";
    c.fillText(tv ? "One more game." : "Make something.", 54, 260);
    c.font = "22px sans-serif";
    c.fillText(
      tv
        ? "A little play belongs in every day."
        : "A few projects. A few ideas. A curious mind.",
      57,
      309,
    );
    if (!tv) {
      for (let i = 0; i < 5; i++) {
        c.fillStyle = ["#e3b75c", "#f7e9d0", "#d8e5ce", "#afa1c3", "#9ebac9"][
          i
        ];
        c.beginPath();
        c.roundRect(353 + i * 68, 481, 53, 53, 12);
        c.fill();
      }
    }
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = Math.min(
      8,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    const mesh = this.node(name) as T.Mesh;
    mesh.geometry.dispose();
    mesh.geometry = new T.PlaneGeometry(tv ? 1.018 : 0.863, tv ? 0.571 : 0.485);
    mesh.position.z += 0.004;
    mesh.material = new T.MeshBasicMaterial({ map: texture });
    mesh.castShadow = false;
  }
  private makeBubble() {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const x = c.getContext("2d")!;
    x.fillStyle = "#fff5df";
    x.beginPath();
    x.ellipse(131, 108, 104, 81, 0, 0, Math.PI * 2);
    x.fill();
    x.beginPath();
    x.arc(65, 200, 15, 0, Math.PI * 2);
    x.fill();
    x.beginPath();
    x.arc(41, 230, 7, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "#7d829f";
    x.font = "88px Georgia";
    x.fillText("☾", 84, 139);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    return new T.Sprite(
      new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
  }
  private makeDream() {
    const p = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      p[i * 3] = (Math.random() - 0.5) * 30;
      p[i * 3 + 1] = (Math.random() - 0.1) * 20;
      p[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(p, 3));
    const stars = new T.Points(
      geo,
      new T.PointsMaterial({
        color: "#ffe1a2",
        size: 0.035,
        sizeAttenuation: true,
      }),
    );
    this.dream.add(stars);
    const moon = new T.Mesh(
      new T.SphereGeometry(0.62, 48, 32),
      new T.MeshBasicMaterial({ color: "#efd4a0" }),
    );
    moon.position.set(0, 1.4, -2);
    this.dream.add(moon);
    for (let i = 0; i < 12; i++) {
      const mesh = new T.Mesh(
        new T.IcosahedronGeometry(0.12 + Math.random() * 0.15, 1),
        new T.MeshStandardMaterial({
          color: ["#d29b7b", "#85a9a2", "#9692b5"][i % 3],
          roughness: 0.9,
        }),
      );
      mesh.position.set(
        Math.cos(i * 2.4) * (1.1 + i * 0.13),
        Math.sin(i * 0.9) * 0.65 - 0.1,
        Math.sin(i * 2.4) * (1 + i * 0.07),
      );
      mesh.userData = { float: true, y: mesh.position.y };
      this.dream.add(mesh);
    }
    return stars;
  }
  snapshot() {
    return {
      ...this.state,
      actor: this.actor.root.position.toArray(),
      camera: this.camera.position.toArray(),
      fov: this.camera.fov,
      moving: this.path.length > 0,
      pending: this.pending,
      actionTime: this.action?.elapsed ?? null,
      held: this.hold?.object.name ?? null,
      contactError: this.hold
        ? this.hold.object.getWorldPosition(v()).distanceTo(this.hold.target)
        : 0,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
    };
  }
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    this.cleanups.forEach((f) => f());
    this.lighting.dispose();
    this.surfaces.dispose();
    this.scene.traverse((o) => {
      if (o instanceof T.Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          m.dispose(),
        );
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
