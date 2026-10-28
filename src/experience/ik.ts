import * as T from "three";

// Two-bone IK places the elbow/knee in the pole plane and solves the actual
// wrist/ankle position. Joint rotations are relative to their real parents.
export function solveLimb(
  upper: T.Object3D,
  lower: T.Object3D,
  tip: T.Object3D,
  target: T.Vector3,
  pole: T.Vector3,
  weight = 1,
) {
  upper.updateWorldMatrix(true, true);
  const origin = upper.getWorldPosition(new T.Vector3());
  const lengthA = lower.position.length(),
    lengthB = tip.position.length();
  const direction = target.clone().sub(origin);
  const distance = T.MathUtils.clamp(
    direction.length(),
    Math.abs(lengthA - lengthB) + 0.0001,
    lengthA + lengthB - 0.0001,
  );
  direction.normalize();
  const bend = pole
    .clone()
    .sub(origin)
    .addScaledVector(direction, -pole.clone().sub(origin).dot(direction))
    .normalize();
  const along =
    (lengthA * lengthA + distance * distance - lengthB * lengthB) /
    (2 * distance);
  const elbow = origin
    .clone()
    .addScaledVector(direction, along)
    .addScaledVector(
      bend,
      Math.sqrt(Math.max(0, lengthA * lengthA - along * along)),
    );
  // Both segments share a bend plane. Independent shortest-arc rotations
  // can twist the forearm 180 degrees as the wrist rises, collapsing the sleeve.
  const normal = bend.clone().cross(direction).normalize();
  const orient = (axis: T.Vector3) => {
    const y = axis.clone().negate().normalize();
    const z = normal.clone().cross(y).normalize();
    const x = y.clone().cross(z).normalize();
    return new T.Quaternion().setFromRotationMatrix(
      new T.Matrix4().makeBasis(x, y, z),
    );
  };
  const worldRotation = orient(elbow.clone().sub(origin));
  const parentRotation = upper
    .parent!.getWorldQuaternion(new T.Quaternion())
    .invert();
  upper.quaternion.slerp(parentRotation.multiply(worldRotation), weight);
  upper.updateWorldMatrix(false, true);
  const actualElbow = lower.getWorldPosition(new T.Vector3());
  const wrist = origin.clone().addScaledVector(direction, distance);
  worldRotation.copy(orient(wrist.sub(actualElbow)));
  lower.quaternion.slerp(
    upper.getWorldQuaternion(parentRotation).invert().multiply(worldRotation),
    weight,
  );
}
