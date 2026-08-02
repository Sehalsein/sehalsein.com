import { TAU, type Vec2, clamp, mod, v2dist } from "../../shared/math";
import type { Rng } from "../../shared/rng";
import type { TrackDifficulty, TrackStyle } from "../types";

/**
 * Stage: control point generation + distribution optimization.
 *
 * A jittered star-shaped base polygon (sorted by angle → structurally free of
 * self-intersections) is deliberately deformed with circuit features:
 *
 * - straights: collinear helper points pin the spline flat along an edge
 * - chicanes:  paired perpendicular offsets snake the road left-right
 * - hairpins:  a radial out-and-back spike the curvature relaxer rounds
 *              into a corner at exactly the difficulty's minimum radius
 *
 * Style picks how many of each; difficulty scales how violent they are.
 */

interface LayoutTuning {
	pointCount: [number, number];
	radiusJitter: number;
	straights: [number, number];
	chicanes: [number, number];
	hairpins: [number, number];
}

const STYLE_TUNING: Record<TrackStyle, LayoutTuning> = {
	fast: { pointCount: [8, 11], radiusJitter: 0.24, straights: [2, 3], chicanes: [1, 2], hairpins: [0, 1] },
	balanced: { pointCount: [10, 14], radiusJitter: 0.32, straights: [1, 2], chicanes: [1, 3], hairpins: [1, 2] },
	technical: { pointCount: [12, 16], radiusJitter: 0.4, straights: [0, 1], chicanes: [2, 4], hairpins: [2, 3] },
};

const DIFFICULTY_FEATURE_SCALE: Record<TrackDifficulty, number> = {
	easy: 0.8,
	medium: 1,
	hard: 1.2,
};

export function generateControlPoints(
	rng: Rng,
	lengthM: number,
	style: TrackStyle,
	difficulty: TrackDifficulty,
): Vec2[] {
	const tuning = STYLE_TUNING[style];
	const featureScale = DIFFICULTY_FEATURE_SCALE[difficulty];
	const count = rng.int(tuning.pointCount[0], tuning.pointCount[1]);

	// wiggle + features add length; the generator pass rescales afterwards, so
	// the base radius only needs to be in the right ballpark
	const baseRadius = lengthM / (TAU * 1.35);
	const squashA = rng.range(0.75, 1.25);
	const squashB = rng.range(0.75, 1.25);

	// --- base star polygon with strong radial variance ---
	const base: Vec2[] = [];
	for (let i = 0; i < count; i++) {
		const angle = (i / count) * TAU + rng.gaussian() * (0.25 * (TAU / count));
		const radial = clamp(1 + rng.gaussian() * tuning.radiusJitter * 1.5, 0.5, 1.65);
		base.push({
			x: Math.cos(angle) * baseRadius * radial * squashA,
			y: Math.sin(angle) * baseRadius * radial * squashB,
		});
	}

	// --- feature passes ------------------------------------------------------
	// operate on vertex indices of the base polygon; each feature claims its
	// vertex and both neighbors so features never overlap
	const claimed = new Set<number>();
	const claim = (i: number): boolean => {
		for (const o of [-1, 0, 1]) {
			if (claimed.has(mod(i + o, count))) return false;
		}
		for (const o of [-1, 0, 1]) claimed.add(mod(i + o, count));
		return true;
	};
	// insertions keyed by base index, applied in one splice pass at the end
	const inserts = new Map<number, { before: Vec2[]; replace?: Vec2[]; after: Vec2[] }>();
	const featureAt = (i: number) => {
		let entry = inserts.get(i);
		if (!entry) {
			entry = { before: [], after: [] };
			inserts.set(i, entry);
		}
		return entry;
	};

	const edgeDir = (i: number): Vec2 => {
		const a = base[i];
		const b = base[mod(i + 1, count)];
		const len = v2dist(a, b) || 1;
		return { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
	};

	// straights: pin an edge flat with two collinear points
	const straightCount = rng.int(tuning.straights[0], tuning.straights[1]);
	for (let f = 0; f < straightCount; f++) {
		const i = rng.int(0, count - 1);
		if (!claim(i)) continue;
		const a = base[i];
		const b = base[mod(i + 1, count)];
		featureAt(i).after.push(
			{ x: a.x + (b.x - a.x) * 0.33, y: a.y + (b.y - a.y) * 0.33 },
			{ x: a.x + (b.x - a.x) * 0.66, y: a.y + (b.y - a.y) * 0.66 },
		);
	}

	// chicanes: snake across an edge with alternating perpendicular offsets
	const chicaneCount = rng.int(tuning.chicanes[0], tuning.chicanes[1]);
	for (let f = 0; f < chicaneCount; f++) {
		const i = rng.int(0, count - 1);
		if (!claim(i)) continue;
		const a = base[i];
		const b = base[mod(i + 1, count)];
		const dir = edgeDir(i);
		const perp = { x: -dir.y, y: dir.x };
		const offset = rng.range(16, 30) * featureScale * (rng.chance(0.5) ? 1 : -1);
		featureAt(i).after.push(
			{ x: a.x + (b.x - a.x) * 0.38 + perp.x * offset, y: a.y + (b.y - a.y) * 0.38 + perp.y * offset },
			{ x: a.x + (b.x - a.x) * 0.62 - perp.x * offset, y: a.y + (b.y - a.y) * 0.62 - perp.y * offset },
		);
	}

	// hairpins: replace a vertex with an out-and-back radial spike
	const hairpinCount = rng.int(tuning.hairpins[0], tuning.hairpins[1]);
	for (let f = 0; f < hairpinCount; f++) {
		const i = rng.int(0, count - 1);
		if (!claim(i)) continue;
		const p = base[i];
		const radialLen = Math.hypot(p.x, p.y) || 1;
		const radial = { x: p.x / radialLen, y: p.y / radialLen };
		const prev = base[mod(i - 1, count)];
		const next = base[mod(i + 1, count)];
		let tx = next.x - prev.x;
		let ty = next.y - prev.y;
		const tLen = Math.hypot(tx, ty) || 1;
		tx /= tLen;
		ty /= tLen;
		const spike = rng.range(30, 55) * featureScale;
		const gap = rng.range(16, 24);
		featureAt(i).replace = [
			{ x: p.x - tx * gap, y: p.y - ty * gap },
			{ x: p.x + radial.x * spike, y: p.y + radial.y * spike },
			{ x: p.x + tx * gap, y: p.y + ty * gap },
		];
	}

	// --- assemble ------------------------------------------------------------
	const points: Vec2[] = [];
	for (let i = 0; i < count; i++) {
		const feature = inserts.get(i);
		if (feature?.before.length) points.push(...feature.before);
		if (feature?.replace) points.push(...feature.replace);
		else points.push(base[i]);
		if (feature?.after.length) points.push(...feature.after);
	}
	return points;
}

/**
 * Distribution optimization: merge near-duplicate points and relax only true
 * near-reversals (kinks the spline cannot express). Feature geometry — tight
 * but intentional — is preserved; drivability is enforced later by the
 * curvature relaxation stage against the difficulty's minimum turn radius.
 */
export function optimizeControlPoints(points: Vec2[], lengthM: number): Vec2[] {
	let result = [...points];

	// merge points closer than ~15m — they'd kink a centripetal spline
	const minSpacing = Math.max(15, lengthM * 0.004);
	const merged: Vec2[] = [];
	for (let i = 0; i < result.length; i++) {
		const prev = merged[merged.length - 1] ?? result[result.length - 1];
		if (merged.length > 0 && v2dist(result[i], prev) < minSpacing) continue;
		merged.push(result[i]);
	}
	result = merged.length >= 4 ? merged : result;

	// relax only near-total reversals (> ~165°) — sharper than any hairpin
	for (let pass = 0; pass < 4; pass++) {
		let adjusted = false;
		for (let i = 0; i < result.length; i++) {
			const prev = result[mod(i - 1, result.length)];
			const curr = result[i];
			const next = result[mod(i + 1, result.length)];
			const v1x = curr.x - prev.x;
			const v1y = curr.y - prev.y;
			const v2x = next.x - curr.x;
			const v2y = next.y - curr.y;
			const mag = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
			if (mag < 1e-6) continue;
			const dot = (v1x * v2x + v1y * v2y) / mag;
			const turn = Math.acos(Math.min(1, Math.max(-1, dot)));
			if (turn > 2.88) {
				result[i] = {
					x: curr.x + ((prev.x + next.x) / 2 - curr.x) * 0.3,
					y: curr.y + ((prev.y + next.y) / 2 - curr.y) * 0.3,
				};
				adjusted = true;
			}
		}
		if (!adjusted) break;
	}

	return result;
}
