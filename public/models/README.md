# Original studio models

`studio/bedroom.glb` and `studio/character.glb` were modeled for this project in Blender. The active assets do not use geometry from the reference website or the earlier Quaternius avatar.

The bedroom includes beveled furniture, upholstery, keyboard keys, monitor and TV surfaces, lighting fixtures, original poster graphics, decor, and a quilt with opening and sleeping morphs. Independently named roots allow furniture and props to move at runtime.

The character includes a custom skeleton, skinned clothing, face, glasses, hair, shoes, and articulated fingers. Runtime animation is authored in `src/experience/Actor.ts` and `Studio.ts`; animation clips are not baked into the GLB.

## Rebuild with Blender 4.5 LTS

Run from the repository root:

```sh
blender --background --factory-startup --python scripts/studio/build_scene.py
blender --background --factory-startup --python scripts/studio/build_character.py
bun run assets:compress
```

The scripts write the runtime GLBs to this directory and editable sources to `artifacts/studio/bedroom.blend` and `artifacts/studio/character.blend`.

Compression uses `EXT_meshopt_compression` and verifies every decoded buffer against its original bytes. No mesh simplification or geometry quantization is applied. Uncompressed copies are retained in the locally ignored `artifacts/studio/` directory. The runtime uses Three.js’s MeshoptDecoder.

Old asset licenses and models remain with the archived implementation under `artifacts/studio/legacy-source/models/`, outside the public build.
