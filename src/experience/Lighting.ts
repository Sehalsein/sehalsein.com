import * as T from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

class Occlusion extends GTAOPass {
  override render(
    r: T.WebGLRenderer,
    w: T.WebGLRenderTarget,
    read: T.WebGLRenderTarget,
  ) {
    const hidden: T.Object3D[] = [];
    this.scene.traverse((o) => {
      if (o.visible && o instanceof T.Sprite) {
        hidden.push(o);
        o.visible = false;
      }
    });
    super.render(r, w, read, 0, false);
    hidden.forEach((o) => (o.visible = true));
  }
}
export class Lighting {
  private composer: EffectComposer;
  private ao: GTAOPass;
  private env: T.WebGLRenderTarget;
  sun = new T.DirectionalLight("#ffe1a7", 3.5);
  sky = new T.HemisphereLight("#e7f2ff", "#a86b49", 1.9);
  lamp = new T.PointLight("#ffb754", 0, 3, 2);
  desk = new T.PointLight("#ffd792", 0.25, 3, 2);
  constructor(
    renderer: T.WebGLRenderer,
    scene: T.Scene,
    camera: T.PerspectiveCamera,
  ) {
    this.sun.position.set(-3, 6, -6);
    this.sun.target.position.set(1, 0, 1.8);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, {
      left: -4,
      right: 4,
      top: 4,
      bottom: -4,
      near: 0.1,
      far: 18,
    });
    this.sun.shadow.bias = -0.00025;
    this.sun.shadow.normalBias = 0.023;
    const fill = new T.DirectionalLight("#ffe6c7", 0.7);
    fill.position.set(4, 4, 6);
    this.lamp.position.set(-0.84, 0.91, -2.04);
    this.desk.position.set(0.9, 2, -1.8);
    scene.add(this.sun, this.sun.target, this.sky, this.lamp, this.desk, fill);
    const pmrem = new T.PMREMGenerator(renderer),
      studio = new RoomEnvironment();
    this.env = pmrem.fromScene(studio, 0.05);
    scene.environment = this.env.texture;
    scene.environmentIntensity = 0.22;
    pmrem.dispose();
    studio.dispose();
    const rt = new T.WebGLRenderTarget(1, 1, {
      type: T.HalfFloatType,
      samples: 2,
    });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(scene, camera));
    this.ao = new Occlusion(scene, camera, 1, 1);
    this.ao.updateGtaoMaterial({
      radius: 0.19,
      distanceExponent: 1.5,
      thickness: 0.6,
      distanceFallOff: 1,
      scale: 1,
      samples: 12,
      screenSpaceRadius: false,
    });
    this.ao.blendIntensity = 0.7;
    this.ao.updatePdMaterial({ radius: 4, rings: 2, samples: 8 });
    const setSize = this.ao.setSize.bind(this.ao);
    this.ao.setSize = (w, h) => setSize(Math.ceil(w * 0.5), Math.ceil(h * 0.5));
    this.composer.addPass(this.ao);
    this.composer.addPass(
      new UnrealBloomPass(new T.Vector2(1, 1), 0.12, 0.3, 1.4),
    );
    this.composer.addPass(new OutputPass());
  }
  render(dt: number, night: boolean, close: boolean, lamp: boolean) {
    const e = 1 - Math.exp(-dt * 3);
    this.sun.intensity = T.MathUtils.lerp(
      this.sun.intensity,
      night ? 0.28 : 3.5,
      e,
    );
    this.sky.intensity = T.MathUtils.lerp(
      this.sky.intensity,
      night ? 0.85 : 1.9,
      e,
    );
    this.lamp.intensity = T.MathUtils.lerp(
      this.lamp.intensity,
      lamp ? (night ? 1.1 : 0.28) : 0,
      e,
    );
    this.desk.intensity = T.MathUtils.lerp(
      this.desk.intensity,
      night ? 0.85 : 0.25,
      e,
    );
    this.ao.enabled = !close;
    this.composer.render(dt);
  }
  resize(w: number, h: number) {
    this.composer.setSize(w, h);
  }
  dispose() {
    this.composer.passes.forEach((p) => p.dispose());
    this.composer.dispose();
    this.env.dispose();
  }
}
