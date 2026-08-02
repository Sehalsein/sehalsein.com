/**
 * Calibration for the Memoji stickers.
 *
 * This is the only file you need to edit when real artwork lands. Nothing here
 * is code — it is measurements of where the features sit inside each image.
 *
 * ── Dropping in your own Memoji ──────────────────────────────────────────────
 * Export the stickers from iMessage on macOS (drag them out of the sticker
 * drawer) into `public/memoji/`:
 *
 *   public/memoji/neutral.png    ← the only required one
 *   public/memoji/wave.png
 *   public/memoji/smile.png
 *   public/memoji/blink.png      ← optional, only used for the long sleepy blink
 *   public/memoji/surprised.png
 *
 * Requirements:
 *   • square, 1024×1024 or 2048×2048, transparent background
 *   • edges dilated / colour-bled — a transparent texel whose RGB is black will
 *     bleed a dark halo when the texture is mipmapped
 *   • every pose framed identically: same head size, same head centre. The rig
 *     registers poses by `headCenter`/`headHalfWidth`, but cross-fades between
 *     wildly different framings still look like a cut.
 *
 * Then measure the eyes and update the numbers below.
 *
 * ── UV convention ────────────────────────────────────────────────────────────
 * UVs are three.js convention: (0,0) is the BOTTOM-left of the image, (1,1) the
 * top-right. Figma, Photoshop and every browser devtool report a TOP-left
 * origin, so when transcribing a measurement subtract its y from 1. Getting
 * this wrong mirrors the whole calibration vertically, which looks like the
 * eyes landed on the chin.
 */

export const POSE_IDS = ["neutral", "wave", "smile", "blink", "surprised"] as const;
export type PoseId = (typeof POSE_IDS)[number];

/** A point in image space, 0..1, with v measured from the BOTTOM. */
export type UV = readonly [number, number];

export interface EyeCalibration {
	/** Centre of the eye socket. */
	center: UV;
	/**
	 * "cover"   — the artwork draws a whole eye here, pupil included, so paint an
	 *             opaque sclera over it before drawing the movable pupil.
	 *             Use this for real Memoji art.
	 * "overlay" — the artwork draws no pupil (an empty socket, or a bare sclera),
	 *             so the pupil quad can be drawn straight on top. Used by the
	 *             stand-in face, which paints a sclera and nothing else.
	 */
	mode: "cover" | "overlay";
	/** Half-extents of the sclera ellipse, in UV units. */
	socket: UV;
	/** Maximum pupil excursion from centre, in UV units. Keep inside `socket`. */
	pupilTravel: UV;
	/** Pupil radius, in UV units. */
	pupilRadius: number;
	/** Specular dot radius, in UV units. 0 disables the highlight. */
	highlightRadius: number;
}

export interface PoseCalibration {
	id: PoseId;
	/** Aspect (w/h) the art is authored at. 1 for square stickers. */
	aspect: number;
	/** Head centre — keeps the head registered across poses. */
	headCenter: UV;
	/** Head half-width — normalises scale across poses. */
	headHalfWidth: number;
	/** Rock/tilt pivot, roughly the base of the neck. See rig.ts. */
	pivot: UV;
	/** null when the artwork already draws the eyes (e.g. a closed-eye pose). */
	eyes: { left: EyeCalibration; right: EyeCalibration } | null;
	/** Sclera fill for `mode: "cover"`. Eyedrop the white of the sticker's eye. */
	scleraColor: string;
	/** Eyelid fill. Eyedrop the skin immediately above the eye. */
	skinColor: string;
	/** Iris colour. Omit to follow the palette's --color-term-ink. */
	irisColor?: string;
	/** Present when the pose shows a raised hand; biases the wave's rock phase. */
	hand?: { side: "left" | "right"; anchor: UV };
}

/** Shared by every stand-in pose — the sockets the stand-in leaves empty. */
const STANDIN_EYE: Omit<EyeCalibration, "center"> = {
	mode: "overlay",
	socket: [0.045, 0.052],
	pupilTravel: [0.016, 0.013],
	pupilRadius: 0.022,
	highlightRadius: 0.008,
};

export const POSES: Record<PoseId, PoseCalibration> = {
	neutral: {
		id: "neutral",
		aspect: 1,
		headCenter: [0.5, 0.545],
		headHalfWidth: 0.3,
		pivot: [0.5, 0.2],
		eyes: {
			left: { center: [0.41, 0.585], ...STANDIN_EYE },
			right: { center: [0.59, 0.585], ...STANDIN_EYE },
		},
		scleraColor: "#fdfdfb",
		skinColor: "#e8b48c",
	},

	wave: {
		id: "wave",
		aspect: 1,
		// the raised hand occupies the right third, so the head sits left of centre
		headCenter: [0.41, 0.545],
		headHalfWidth: 0.28,
		pivot: [0.41, 0.2],
		eyes: {
			left: { center: [0.325, 0.585], ...STANDIN_EYE },
			right: { center: [0.495, 0.585], ...STANDIN_EYE },
		},
		scleraColor: "#fdfdfb",
		skinColor: "#e8b48c",
		// clear of the head's right edge (0.41 + 0.28 = 0.69) so the palm reads
		hand: { side: "right", anchor: [0.82, 0.66] },
	},

	smile: {
		id: "smile",
		aspect: 1,
		headCenter: [0.5, 0.545],
		headHalfWidth: 0.3,
		pivot: [0.5, 0.2],
		eyes: {
			// a smile squints — narrower sockets, less travel
			left: { center: [0.41, 0.588], ...STANDIN_EYE, socket: [0.05, 0.05], pupilTravel: [0.018, 0.011] },
			right: { center: [0.59, 0.588], ...STANDIN_EYE, socket: [0.05, 0.05], pupilTravel: [0.018, 0.011] },
		},
		scleraColor: "#fdfdfb",
		skinColor: "#e8b48c",
	},

	blink: {
		id: "blink",
		aspect: 1,
		headCenter: [0.5, 0.545],
		headHalfWidth: 0.3,
		pivot: [0.5, 0.2],
		// the artwork draws closed eyes; no pupils to place
		eyes: null,
		scleraColor: "#fdfdfb",
		skinColor: "#e8b48c",
	},

	surprised: {
		id: "surprised",
		aspect: 1,
		headCenter: [0.5, 0.545],
		headHalfWidth: 0.3,
		pivot: [0.5, 0.2],
		eyes: {
			left: { center: [0.41, 0.59], ...STANDIN_EYE, socket: [0.06, 0.078], pupilRadius: 0.03 },
			right: { center: [0.59, 0.59], ...STANDIN_EYE, socket: [0.06, 0.078], pupilRadius: 0.03 },
		},
		scleraColor: "#fdfdfb",
		skinColor: "#e8b48c",
	},
};

/**
 * Which pose to borrow when this one's PNG is missing.
 *
 * This exists so a half-finished art drop never puts a real Memoji and a
 * stand-in doodle on screen in the same session — if `neutral.png` is there,
 * every pose resolves to real art, just with fewer distinct expressions.
 * `neutral` has no fallback: if it's absent, the whole face is the stand-in.
 */
export const POSE_FALLBACK: Record<PoseId, PoseId | null> = {
	neutral: null,
	// the rig rocks harder to compensate for the missing arm
	wave: "neutral",
	smile: "neutral",
	// the lid quads carry the blink anyway; this pose is only for dozing
	blink: "neutral",
	surprised: "neutral",
};
