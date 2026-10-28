import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Batch static geometry inside each independent interaction/animation group.
// The clickable object roots and movable parts retain their own transforms.
export function consolidateGeometry(
  root: T.Object3D,
  keepIndependent: T.Object3D[],
) {
  const boundaries = new Set([root, ...keepIndependent]);
  const buckets = new Map<T.Object3D, Map<string, T.Mesh[]>>();
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    const mesh = object as T.Mesh;
    if (
      !mesh.isMesh ||
      (mesh as T.InstancedMesh).isInstancedMesh ||
      (mesh as T.SkinnedMesh).isSkinnedMesh ||
      Array.isArray(mesh.material) ||
      boundaries.has(mesh)
    )
      return;
    let owner = mesh.parent!;
    while (!boundaries.has(owner) && owner.parent) owner = owner.parent;
    const material = mesh.material as T.MeshStandardMaterial;
    const key = JSON.stringify([
      Object.entries(mesh.geometry.attributes)
        .map(([name, attribute]) => [
          name,
          attribute.itemSize,
          attribute.normalized,
          attribute.array.constructor.name,
        ])
        .sort(),
      material.type,
      material.color?.getHex(),
      material.emissive?.getHex(),
      material.emissiveIntensity,
      material.roughness,
      material.metalness,
      material.map?.uuid,
      material.side,
      material.transparent,
      material.opacity,
      material.colorWrite,
      material.depthWrite,
      mesh.castShadow,
      mesh.receiveShadow,
    ]);
    if (!buckets.has(owner)) buckets.set(owner, new Map());
    const group = buckets.get(owner)!;
    if (!group.has(key)) group.set(key, []);
    group.get(key)!.push(mesh);
  });
  for (const [owner, groups] of buckets) {
    const inverse = owner.matrixWorld.clone().invert();
    for (const meshes of groups.values()) {
      if (meshes.length < 2) continue;
      const geometries = meshes.map((mesh) => {
        const geometry = mesh.geometry.index
          ? mesh.geometry.toNonIndexed()
          : mesh.geometry.clone();
        geometry.applyMatrix4(
          new T.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld),
        );
        return geometry;
      });
      const merged = mergeGeometries(geometries);
      geometries.forEach((geometry) => geometry.dispose());
      if (!merged) continue;
      const batch = new T.Mesh(merged, meshes[0].material);
      batch.castShadow = meshes[0].castShadow;
      batch.receiveShadow = meshes[0].receiveShadow;
      owner.add(batch);
      meshes.forEach((mesh) => mesh.removeFromParent());
    }
  }
}
