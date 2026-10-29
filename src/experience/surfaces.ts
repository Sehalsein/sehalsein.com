import * as T from "three";

export type SurfaceId = "computer" | "resume" | "books" | "board" | "tv";
type Surface = {
  element: HTMLElement;
  source: T.Object3D;
  width: number;
  height: number;
  offset: T.Vector3;
  rotation: T.Quaternion;
};
type Point = { x: number; y: number };

// Flatten the camera's projected plane into a single CSS homography. This keeps
// browser hit testing in viewport space, including on cameras inside the room.
// Nested CSS camera transforms can render correctly but lose pointer hits.
export function planeTransform(
  points: Point[],
  width: number,
  height: number,
): number[] {
  const [a, b, c, d] = points;
  const dx1 = b.x - c.x,
    dx2 = d.x - c.x,
    dx3 = a.x - b.x + c.x - d.x;
  const dy1 = b.y - c.y,
    dy2 = d.y - c.y,
    dy3 = a.y - b.y + c.y - d.y;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = Math.abs(det) > 1e-10 ? (dx3 * dy2 - dx2 * dy3) / det : 0;
  const h = Math.abs(det) > 1e-10 ? (dx1 * dy3 - dx3 * dy1) / det : 0;
  return [
    (b.x - a.x + g * b.x) / width,
    (b.y - a.y + g * b.y) / width,
    0,
    g / width,
    (d.x - a.x + h * d.x) / height,
    (d.y - a.y + h * d.y) / height,
    0,
    h / height,
    0,
    0,
    1,
    0,
    a.x,
    a.y,
    0,
    1,
  ];
}

export class WorldSurfaces {
  private host = document.createElement("div");
  private items = new Map<SurfaceId, Surface>();
  private active: SurfaceId | null = null;
  private enabled = false;
  private width = 1;
  private height = 1;
  private position = new T.Vector3();
  private rotation = new T.Quaternion();
  constructor(parent: HTMLElement) {
    this.host.className = "world-surfaces";
    parent.appendChild(this.host);
  }
  mount(
    id: SurfaceId,
    element: HTMLElement,
    source: T.Object3D,
    width: number,
    height: number,
    rotation = new T.Euler(),
    offset = new T.Vector3(),
  ) {
    this.items.set(id, {
      element,
      source,
      width,
      height,
      offset,
      rotation: new T.Quaternion().setFromEuler(rotation),
    });
    this.host.appendChild(element);
  }
  show(id: SurfaceId | null, enabled = false) {
    this.active = id;
    this.enabled = enabled;
  }
  render(camera: T.PerspectiveCamera, portrait: boolean) {
    for (const [id, surface] of this.items) {
      const { element, source } = surface;
      const visible = this.active === id;
      element.inert = !visible || !this.enabled;
      element.style.pointerEvents = visible && this.enabled ? "auto" : "none";
      element.style.visibility = visible ? "visible" : "hidden";
      element.style.display = visible ? "block" : "none";
      if (!visible) continue;
      source.updateWorldMatrix(true, false);
      this.position.copy(surface.offset).applyMatrix4(source.matrixWorld);
      source.getWorldQuaternion(this.rotation);
      this.rotation.multiply(surface.rotation);
      let width = surface.width,
        height = surface.height;
      if (id === "computer" && portrait) {
        [width, height] = [height, width];
        this.rotation.multiply(
          new T.Quaternion().setFromAxisAngle(
            new T.Vector3(0, 0, 1),
            Math.PI / 2,
          ),
        );
      }
      const pixels =
        id === "computer"
          ? portrait
            ? 560
            : 1205
          : id === "tv"
            ? 1200
            : id === "board"
              ? 1000
              : 650;
      const pixelHeight = (pixels * height) / width;
      element.style.width = `${pixels}px`;
      element.style.height = `${pixelHeight}px`;
      const corners = [
        [-1, 1],
        [1, 1],
        [1, -1],
        [-1, -1],
      ].map(([x, y]) =>
        new T.Vector3((x * width) / 2, (y * height) / 2, 0)
          .applyQuaternion(this.rotation)
          .add(this.position)
          .project(camera),
      );
      if (corners.some((p) => p.z > 1 || p.z < -1)) {
        element.style.visibility = "hidden";
        continue;
      }
      const points = corners.map((p) => ({
        x: ((p.x + 1) * this.width) / 2,
        y: ((1 - p.y) * this.height) / 2,
      }));
      const matrix = planeTransform(points, pixels, pixelHeight);
      element.style.transform = `matrix3d(${matrix.map((n) => (Math.abs(n) < 1e-12 ? 0 : n)).join(",")})`;
    }
  }
  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  dispose() {
    this.items.clear();
    this.host.remove();
  }
}
