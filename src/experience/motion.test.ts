import { describe, it, expect } from "bun:test";
import * as T from "three";
import { Actor } from "./Actor";
import { planCameraPath, segmentBlocked } from "./camera";
import { planeTransform } from "./surfaces";
describe("physical contact and camera motion", () => {
  it("places the skinned hand control on a reachable target at every facing", () => {
    const a = new Actor();
    for (const yaw of [0, 0.4, Math.PI / 2, Math.PI, -1.8])
      for (const side of [0, 1])
        for (const height of [0.83, 1.05, 1.3]) {
          a.reset(0);
          a.root.rotation.y = yaw;
          const p = a.root.localToWorld(
            new T.Vector3(side ? 0.29 : -0.29, height, 0.24),
          );
          a.hand(side, p);
          expect(
            a.hands[side].getWorldPosition(new T.Vector3()).distanceTo(p),
          ).toBeLessThan(0.001);
        }
  });
  it("sweeps the whole camera segment around chair and monitor volumes", () => {
    const obstacles = [
      {
        name: "chair",
        box: new T.Box3(
          new T.Vector3(0.63, 0, -1.6),
          new T.Vector3(1.21, 1, -0.98),
        ),
      },
      {
        name: "monitor",
        box: new T.Box3(
          new T.Vector3(0.44, 0.95, -2.18),
          new T.Vector3(1.4, 1.53, -2.07),
        ),
      },
    ];
    for (const [from, to] of [
      [new T.Vector3(6, 7, 8), new T.Vector3(0.92, 1.4, -1)],
      [new T.Vector3(0.92, 0.8, -0.6), new T.Vector3(0.92, 1.24, -1.9)],
    ]) {
      const path = planCameraPath(from, to, obstacles, 0.045);
      let last = path.at(0);
      expect(last.distanceTo(from)).toBeLessThan(1e-8);
      expect(path.at(1).distanceTo(to)).toBeLessThan(1e-8);
      for (let i = 1; i <= 240; i++) {
        const next = path.at(i / 240);
        for (const o of obstacles)
          expect(
            segmentBlocked(last, next, o.box.clone().expandByScalar(0.04)),
          ).toBe(false);
        last = next;
      }
    }
  });
  it("keeps native browser click targets aligned with tilted physical pages", () => {
    const corners = [
      { x: 150, y: 100 },
      { x: 830, y: 170 },
      { x: 970, y: 760 },
      { x: 83, y: 715 },
    ];
    const m = planeTransform(corners, 650, 900);
    for (const [i, x, y] of [
      [0, 0, 0],
      [1, 650, 0],
      [2, 650, 900],
      [3, 0, 900],
    ]) {
      const w = m[3] * x + m[7] * y + m[15];
      expect((m[0] * x + m[4] * y + m[12]) / w).toBeCloseTo(corners[i].x, 5);
      expect((m[1] * x + m[5] * y + m[13]) / w).toBeCloseTo(corners[i].y, 5);
    }
  });
});
