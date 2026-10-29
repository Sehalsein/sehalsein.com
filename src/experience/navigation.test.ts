import { describe, it, expect } from "bun:test";
import {
  findPath,
  canStand,
  clearLine,
  advancePath,
  moveWithCollision,
} from "./navigation";
import { SPOTS } from "./objects";
describe("compact room routes", () => {
  it("reaches every object through the open aisle", () => {
    const points = [
      { x: -0.4, z: 0.76 },
      ...Object.values(SPOTS).map((s) => s.point),
    ];
    for (const p of points) expect(canStand(p)).toBe(true);
    for (const a of points)
      for (const b of points) {
        const path = findPath(a, b);
        expect(path.length).toBeGreaterThan(0);
        let last = a;
        for (const p of path) {
          expect(clearLine(last, p)).toBe(true);
          last = p;
        }
      }
  });
  it("does not tunnel into furniture after a slow frame", () => {
    const p = moveWithCollision({ x: -0.8, z: 0.3 }, -5, -5);
    expect(canStand(p)).toBe(true);
    for (const s of Object.values(SPOTS)) {
      const path = findPath({ x: -0.4, z: 0.76 }, s.point);
      let p = { x: -0.4, z: 0.76 };
      for (let i = 0; i < 500 && path.length; i++) {
        p = advancePath(p, path, 0.13);
        expect(canStand(p)).toBe(true);
      }
      expect(path.length).toBe(0);
    }
  });
});
