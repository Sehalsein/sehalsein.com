/**
 * Uniform-grid spatial hash over 2D points (XZ plane). Turns "nearest road
 * sample" queries — used heavily by terrain flattening, scenery keep-out and
 * clearance validation — from O(n) scans into O(1) cell lookups.
 */
export class SpatialHash2D {
	private cells = new Map<number, number[]>();
	private cellSize: number;
	private xs: Float32Array;
	private zs: Float32Array;

	constructor(xs: Float32Array, zs: Float32Array, cellSize: number) {
		this.cellSize = cellSize;
		this.xs = xs;
		this.zs = zs;
		for (let i = 0; i < xs.length; i++) {
			const key = this.key(Math.floor(xs[i] / cellSize), Math.floor(zs[i] / cellSize));
			let cell = this.cells.get(key);
			if (!cell) {
				cell = [];
				this.cells.set(key, cell);
			}
			cell.push(i);
		}
	}

	private key(cx: number, cz: number): number {
		// interleave into one int key (offsets keep negatives positive)
		return (cx + 32768) * 65536 + (cz + 32768);
	}

	/** Indices of stored points within `radius` of (x, z). */
	query(x: number, z: number, radius: number): number[] {
		const result: number[] = [];
		const minCx = Math.floor((x - radius) / this.cellSize);
		const maxCx = Math.floor((x + radius) / this.cellSize);
		const minCz = Math.floor((z - radius) / this.cellSize);
		const maxCz = Math.floor((z + radius) / this.cellSize);
		const r2 = radius * radius;
		for (let cx = minCx; cx <= maxCx; cx++) {
			for (let cz = minCz; cz <= maxCz; cz++) {
				const cell = this.cells.get(this.key(cx, cz));
				if (!cell) continue;
				for (const i of cell) {
					const dx = this.xs[i] - x;
					const dz = this.zs[i] - z;
					if (dx * dx + dz * dz <= r2) result.push(i);
				}
			}
		}
		return result;
	}

	/** Squared distance to the nearest stored point, searching outward ring by ring. */
	nearestDistSq(x: number, z: number, maxRadius: number): number {
		let radius = this.cellSize;
		while (radius <= maxRadius) {
			const found = this.query(x, z, radius);
			if (found.length > 0) {
				let best = Number.POSITIVE_INFINITY;
				for (const i of found) {
					const dx = this.xs[i] - x;
					const dz = this.zs[i] - z;
					const d2 = dx * dx + dz * dz;
					if (d2 < best) best = d2;
				}
				return best;
			}
			radius *= 2;
		}
		return Number.POSITIVE_INFINITY;
	}
}
