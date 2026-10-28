import * as T from "three";
export type KeepOut = { name: string; box: T.Box3 };
// Slab intersection tests the complete swept segment, including frames that
// span a thin object. Camera clearance includes the near plane, not just its eye.
export function segmentBlocked(
  a: T.Vector3,
  b: T.Vector3,
  box: T.Box3,
): boolean {
  let enter = 0,
    exit = 1;
  for (const axis of ["x", "y", "z"] as const) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-10) {
      if (a[axis] < box.min[axis] || a[axis] > box.max[axis]) return false;
    } else {
      const t0 = (box.min[axis] - a[axis]) / delta;
      const t1 = (box.max[axis] - a[axis]) / delta;
      enter = Math.max(enter, Math.min(t0, t1));
      exit = Math.min(exit, Math.max(t0, t1));
      if (enter > exit) return false;
    }
  }
  return true;
}

export class TravelPath {
  private lengths = [0];
  readonly length: number;
  constructor(readonly points: T.Vector3[]) {
    for (let i = 1; i < points.length; i++)
      this.lengths.push(
        this.lengths[i - 1] + points[i].distanceTo(points[i - 1]),
      );
    this.length = this.lengths.at(-1)!;
  }
  at(progress: number, out = new T.Vector3()) {
    const distance = T.MathUtils.clamp(progress, 0, 1) * this.length;
    let lo = 1,
      hi = this.points.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.lengths[mid] < distance) lo = mid + 1;
      else hi = mid;
    }
    const i = Math.max(1, lo);
    return out.lerpVectors(
      this.points[i - 1],
      this.points[i],
      (distance - this.lengths[i - 1]) /
        (this.lengths[i] - this.lengths[i - 1] || 1),
    );
  }
}

export function roundedPath(
  points: T.Vector3[],
  obstacles: T.Box3[] = [],
  radius = 0.38,
): TravelPath {
  const clear = (a: T.Vector3, b: T.Vector3) =>
    !obstacles.some((box) => segmentBlocked(a, b, box));
  const output = [points[0].clone()];
  for (let i = 1; i < points.length - 1; i++) {
    const before = points[i - 1],
      corner = points[i],
      after = points[i + 1];
    let r = Math.min(
      radius,
      before.distanceTo(corner) * 0.4,
      after.distanceTo(corner) * 0.4,
    );
    let samples: T.Vector3[] = [];
    for (let attempt = 0; attempt < 10; attempt++, r *= 0.5) {
      const a = corner.clone().lerp(before, r / before.distanceTo(corner));
      const b = corner.clone().lerp(after, r / after.distanceTo(corner));
      samples = new T.QuadraticBezierCurve3(a, corner, b).getPoints(24);
      if (
        samples.every((p, k) => clear(k ? samples[k - 1] : output.at(-1)!, p))
      )
        break;
    }
    output.push(...samples);
  }
  output.push(points.at(-1)!.clone());
  return new TravelPath(output);
}

export function planCameraPath(
  from: T.Vector3,
  to: T.Vector3,
  obstacles: KeepOut[],
  clearance = 0.14,
): TravelPath {
  const boxes = obstacles.map(({ box }) =>
    box.clone().expandByScalar(clearance),
  );
  const clear = (a: T.Vector3, b: T.Vector3) =>
    !boxes.some((box) => segmentBlocked(a, b, box));
  if (clear(from, to)) return roundedPath([from, to]);
  // A visibility graph around expanded furniture finds a short safe route.
  // Extra corner clearance lets us round bends without cutting across a solid.
  const nodes = [from.clone(), to.clone()];
  for (const box of boxes) {
    const outer = box.clone().expandByScalar(0.22);
    for (const x of [outer.min.x, outer.max.x])
      for (const y of [outer.min.y, outer.max.y])
        for (const z of [outer.min.z, outer.max.z]) {
          const p = new T.Vector3(x, y, z);
          if (y >= 0.3 && !boxes.some((b) => b.containsPoint(p))) nodes.push(p);
        }
  }
  const costs = nodes.map(() => Infinity),
    parents = nodes.map(() => -1),
    visited = new Set<number>();
  costs[0] = 0;
  while (visited.size < nodes.length) {
    let current = -1,
      cost = Infinity;
    for (let i = 0; i < nodes.length; i++)
      if (!visited.has(i) && costs[i] < cost) {
        current = i;
        cost = costs[i];
      }
    if (current < 0 || current === 1) break;
    visited.add(current);
    for (let j = 0; j < nodes.length; j++) {
      if (visited.has(j)) continue;
      const next = cost + nodes[current].distanceTo(nodes[j]);
      if (next < costs[j] && clear(nodes[current], nodes[j])) {
        costs[j] = next;
        parents[j] = current;
      }
    }
  }
  if (parents[1] < 0) {
    // An invalid endpoint must never turn into a dolly through furniture.
    throw new Error(
      `No clear camera route: ${from.toArray()} → ${to.toArray()}`,
    );
  }
  const route = [to.clone()];
  for (let i = parents[1]; i >= 0; i = parents[i]) route.unshift(nodes[i]);
  return roundedPath(route, boxes, 0.6);
}
