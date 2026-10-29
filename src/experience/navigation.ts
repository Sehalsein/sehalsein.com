export type Point = { x: number; z: number };
export type Obstacle = { x: number; z: number; width: number; depth: number };
export const ROOM = { minX: -2.72, maxX: 2.72, minZ: -2.32, maxZ: 2.32 };
export const RADIUS = 0.17;
export const OBSTACLES: Obstacle[] = [
  { x: -1.91, z: -1.14, width: 1.48, depth: 2.18 },
  { x: 0.85, z: -1.99, width: 1.91, depth: 0.77 },
  { x: 2.28, z: -2.04, width: 0.69, depth: 0.55 },
  { x: -0.86, z: -1.96, width: 0.45, depth: 0.51 },
  { x: -2.47, z: 1.13, width: 0.54, depth: 1.02 },
  { x: 2.39, z: 0.43, width: 0.42, depth: 1.25 },
  { x: 1.4, z: 1.67, width: 0.96, depth: 0.97 },
  { x: 0.48, z: 1.65, width: 0.5, depth: 0.5 },
  { x: 0.92, z: -1.18, width: 0.53, depth: 0.48 },
  { x: -2.3, z: 2.02, width: 0.67, depth: 0.45 },
];

export function canStand(p: Point, obstacles = OBSTACLES): boolean {
  if (
    p.x < ROOM.minX + RADIUS ||
    p.x > ROOM.maxX - RADIUS ||
    p.z < ROOM.minZ + RADIUS ||
    p.z > ROOM.maxZ - RADIUS
  )
    return false;
  return !obstacles.some(
    (o) =>
      Math.abs(p.x - o.x) < o.width / 2 + RADIUS &&
      Math.abs(p.z - o.z) < o.depth / 2 + RADIUS,
  );
}

export function moveWithCollision(p: Point, dx: number, dz: number): Point {
  // Substeps prevent a slow frame from moving through furniture.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.09));
  const result = { ...p };
  for (let i = 0; i < steps; i++) {
    const xStep = { x: result.x + dx / steps, z: result.z };
    if (canStand(xStep)) result.x = xStep.x;
    const zStep = { x: result.x, z: result.z + dz / steps };
    if (canStand(zStep)) result.z = zStep.z;
  }
  return result;
}

// Reach each waypoint exactly before turning. Skipping a nearby corner can
// otherwise send the next segment through a desk even when the path is valid.
export function advancePath(p: Point, path: Point[], distance: number): Point {
  const target = path[0];
  if (!target) return p;
  const remaining = Math.hypot(target.x - p.x, target.z - p.z);
  if (remaining < 0.0001) {
    path.shift();
    return { ...target };
  }
  const fraction = Math.min(1, distance / remaining);
  const result = moveWithCollision(
    p,
    (target.x - p.x) * fraction,
    (target.z - p.z) * fraction,
  );
  if (Math.hypot(result.x - target.x, result.z - target.z) < 0.0001) {
    path.shift();
    return { ...target };
  }
  return result;
}

export function clearLine(a: Point, b: Point): boolean {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.08);
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    if (!canStand({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }))
      return false;
  }
  return true;
}

const CELL = 0.12;
const COLS = Math.ceil((ROOM.maxX - ROOM.minX) / CELL);
const ROWS = Math.ceil((ROOM.maxZ - ROOM.minZ) / CELL);
const keyOf = (x: number, z: number) => z * COLS + x;
const pointOf = (key: number): Point => ({
  x: ROOM.minX + (key % COLS) * CELL,
  z: ROOM.minZ + Math.floor(key / COLS) * CELL,
});

export function findPath(from: Point, to: Point): Point[] {
  if (!canStand(to) || !canStand(from)) return [];
  if (clearLine(from, to)) return [to];
  const closest = (p: Point) => {
    let key = -1,
      distance = Infinity;
    for (let z = 0; z < ROWS; z++)
      for (let x = 0; x < COLS; x++) {
        const candidate = keyOf(x, z),
          point = pointOf(candidate);
        const d = Math.hypot(p.x - point.x, p.z - point.z);
        if (d < distance && canStand(point) && clearLine(p, point)) {
          key = candidate;
          distance = d;
        }
      }
    return key;
  };
  const start = closest(from),
    end = closest(to);
  if (start < 0 || end < 0) return [];
  const open = new Set([start]),
    closed = new Set<number>();
  const costs = new Map([[start, 0]]),
    parents = new Map<number, number>();
  const heuristic = (key: number) =>
    Math.hypot(pointOf(key).x - to.x, pointOf(key).z - to.z);
  while (open.size) {
    let current = -1,
      best = Infinity;
    for (const key of open) {
      const score = (costs.get(key) ?? Infinity) + heuristic(key);
      if (score < best) {
        best = score;
        current = key;
      }
    }
    if (current === end) {
      const raw: Point[] = [to];
      while (current !== start) {
        raw.unshift(pointOf(current));
        current = parents.get(current)!;
      }
      raw.unshift(from);
      const path: Point[] = [];
      let index = 0;
      while (index < raw.length - 1) {
        let next = raw.length - 1;
        while (next > index + 1 && !clearLine(raw[index], raw[next])) next--;
        path.push(raw[next]);
        index = next;
      }
      return path;
    }
    open.delete(current);
    closed.add(current);
    const x = current % COLS,
      z = Math.floor(current / COLS);
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        if (
          (!dx && !dz) ||
          x + dx < 0 ||
          x + dx >= COLS ||
          z + dz < 0 ||
          z + dz >= ROWS
        )
          continue;
        const key = keyOf(x + dx, z + dz);
        if (closed.has(key) || !clearLine(pointOf(current), pointOf(key)))
          continue;
        const cost = costs.get(current)! + Math.hypot(dx, dz) * CELL;
        if (cost < (costs.get(key) ?? Infinity)) {
          costs.set(key, cost);
          parents.set(key, current);
          open.add(key);
        }
      }
  }
  return [];
}
