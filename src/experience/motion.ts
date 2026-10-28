import * as T from "three";
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
export const ease = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
export const between = (time: number, start: number, end: number) =>
  ease((time - start) / (end - start));
export function track(time: number, keys: [number, number][]) {
  if (time <= keys[0][0]) return keys[0][1];
  if (time >= keys.at(-1)![0]) return keys.at(-1)![1];
  const index = keys.findIndex((k) => k[0] > time) - 1;
  const a = keys[index],
    b = keys[index + 1],
    before = keys[Math.max(0, index - 1)],
    after = keys[Math.min(keys.length - 1, index + 2)];
  const d = b[0] - a[0],
    t = (time - a[0]) / d;
  // Shape-preserving Hermite: monotone tracks don't overshoot furniture contacts.
  const delta = (b[1] - a[1]) / d;
  let m0 = index === 0 ? 0 : (b[1] - before[1]) / (b[0] - before[0]);
  let m1 =
    index === keys.length - 2 ? 0 : (after[1] - a[1]) / (after[0] - a[0]);
  if (delta === 0) m0 = m1 = 0;
  else {
    m0 =
      Math.sign(m0) === Math.sign(delta)
        ? Math.sign(delta) * Math.min(Math.abs(m0), Math.abs(3 * delta))
        : 0;
    m1 =
      Math.sign(m1) === Math.sign(delta)
        ? Math.sign(delta) * Math.min(Math.abs(m1), Math.abs(3 * delta))
        : 0;
  }
  return (
    (2 * t * t * t - 3 * t * t + 1) * a[1] +
    (t * t * t - 2 * t * t + t) * d * m0 +
    (-2 * t * t * t + 3 * t * t) * b[1] +
    (t * t * t - t * t) * d * m1
  );
}
export function angle(from: number, to: number, t: number) {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * t;
}
export function arc(from: T.Vector3, to: T.Vector3, t: number, height = 0.08) {
  return from
    .clone()
    .lerp(to, t)
    .add(new T.Vector3(0, Math.sin(Math.PI * t) * height, 0));
}
export type Action = {
  duration: number;
  update: (time: number, dt: number) => void;
  finish?: () => void;
  elapsed?: number;
};
