# A room for a curious mind

The website is an explorable bedroom with a warm afternoon palette, wood,
textured fabric, collected art, and a calm third-person camera. The avatar and
belongings are provisional until Sehal chooses more personal references.

The active room, furniture, and skinned character are original Blender models. Movement uses authored timelines and inverse kinematics for hands and feet. The earlier Quaternius assets are archived locally and are not part of the active build.
The scene is real-time 3D, not a generated-image backdrop. The current art is
stylized and intentionally simpler than the earlier concept render.

## Original artwork

`public/art/collected-worlds.png` was generated with the built-in imagegen tool.
Three square illustrations share one atlas. The room and interfaces sample
the individual panels directly, without destructive edits to the image.
The posters represent fictional places and are not claims about Sehal's
personal fandoms. Keep the original atlas for future revisions.

### Exact generation prompt

Use case: stylized-concept. Asset type: original artwork texture atlas for framed posters, a computer wallpaper, and a dream sequence in a warm 3D bedroom game. Create a wide 3:1 image divided into EXACTLY THREE equal-sized square panels touching edge-to-edge with NO margins, NO gutters, NO frames, NO writing, NO logos, and NO watermarks. Each panel must be independently composed and fill its own square completely. Left third: a tiny lone traveler on a grassy cliff, a huge cream crescent moon above a mysterious mountain citadel, dusty violet night sky, amber lit windows, painterly illustrated fantasy with elegant atmospheric depth. Middle third: an astronaut in a burnt orange suit among golden flowers on a small strange planet with pale turquoise sky and cream ringed celestial bodies, retro screen-printed science fiction illustration with visible paper grain. Right third: a sun-drenched Japanese-inspired overgrown little wooden house under a vast leafy tree, warm ochre and soft sage, a quiet contemplative afternoon, richly painted atmospheric illustration. Sophisticated collectible art prints, muted jewel tones, delicate textural details, restrained compositions. These are original fictional illustrations, not factual locations or depictions of the user's hobbies.

## Technical references

- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Cloudflare static assets](https://developers.cloudflare.com/workers/static-assets/)

## Current boundaries

The world is a single room with simple collision geometry and an original
skinned character with a contact rig. The dream is a short atmospheric scene with
floating objects and a return to the bedroom. The computer apps and games are local;
notes are stored only on the visitor's device. The résumé has text download
and browser print-to-PDF support. No live guestbook or external backend is
implied by these interfaces.
