# Sehal’s room

A playable bedroom portfolio built with React, Three.js, and original Blender models. The room and character were rebuilt together at metre scale, with a warm oak, terracotta, cream, and teal palette.

## Run

Requires Bun 1.4+, Node 22.12+, and a WebGL-capable browser.

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://localhost:3000`. Production output is the static `dist/` directory.

```sh
bun run test
bun run build
bun run test:browser
bun run record:room
```

Browser checks require a running development server and installed Google Chrome. `test:browser` covers the object interactions, held-prop targets, computer input, responsive monitor, queued exits, and native dialogs. Screenshots and measurements go to `/tmp/studio-all` and `/tmp/studio-viewports`. `STUDIO_QA_DIR` overrides the interaction-check directory.

`record:room` captures only the local application tab, requesting 60 fps and no audio. The WebM, chapter timings, and frame-time measurements go to `/tmp/studio-recording` by default; `STUDIO_QA_DIR` overrides that directory. Recorded frame times are specific to the test machine and viewport.

## Explore

- Walk with WASD or arrow keys, or click/tap a clear patch of floor.
- Click an object, use the Explore directory, or press E near an object.
- Drag to orbit; scroll to zoom; Escape to return.
- Touch controls provide directional movement.
- About, résumé, and contact remain directly accessible.

At the desk, the character pulls and swivels the chair, sits, and rolls forward. The camera then moves to the desk. Coffee is picked up by the handle, papers become held pages, and the computer opens inside its physical bezel. On a narrow screen, the monitor pivots to portrait. The computer contains work, about, browser-local notes, contact, and a game.

At the bed, the quilt folds aside, the character gets onto the mattress, and the quilt closes. A dream bubble leads through a dissolve to a quiet dream scene. Escape wakes the character and restores the room. Other interactions include a held notebook and astronaut, a controller and TV, watering a plant, curtains, a lamp, artwork, and wardrobe colors.

## Implementation

- `scripts/studio/build_scene.py` — original Blender room, furnishings, decor, and quilt morphs.
- `scripts/studio/build_character.py` — original character, clothing, face, skeleton, and fingers.
- `src/experience/Studio.ts` — scene lifecycle and coordinated interaction sequences.
- `src/experience/Actor.ts` — skin controls, foot placement, hand IK, grip, and facial states.
- `src/experience/navigation.ts` — floor navigation and furniture clearance.
- `src/experience/camera.ts` — camera paths around furniture.
- `src/experience/Lighting.ts` — environment lighting, shadows, occlusion, and postprocessing.
- `src/experience/surfaces.ts` — native HTML controls aligned to physical 3D surfaces.
- `src/App.tsx`, `src/studio.css` — application shell and visual design.
- `src/ui/` — computer, content panels, and game.
- `src/content/profile.ts` — personal content.

Animations are authored timelines with IK contacts and shared character/prop transforms. Hand-held objects are parented to the hand after grasping and restored to their original transforms on release. Camera paths use furniture bounds; character movement uses a floor obstacle map. These checks complement visual review and do not constitute general physics or cloth simulation.

The previous room implementation is archived under the locally ignored `artifacts/studio/legacy-source/`. The active build imports `src/experience`. Functional computer, content, and game components from the earlier room are retained and restyled.

See [model build notes](public/models/README.md) for editable Blender sources and lossless compression. Local review videos and `.blend` files are stored under `artifacts/studio/`, excluded from production output.
