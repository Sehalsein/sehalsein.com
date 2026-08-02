import type { TextureName } from "../art/textures";

/**
 * Grid map. One cell is one world unit square; the raycaster walks this grid
 * directly, so lookups are flat typed arrays rather than objects.
 *
 * Doors live in the same grid as walls: a door cell is solid until its leaf has
 * slid far enough aside, and the renderer treats the slid-away fraction of the
 * cell face as see-through.
 */

/** Cell flags. */
export const CELL_SECRET = 1;
/** Floor that hurts — lava. */
export const CELL_HURT = 2;
/** Wall you can activate to end the level. */
export const CELL_EXIT = 4;

export type KeyColor = "red" | "blue" | "yellow";

export type DoorState = "closed" | "opening" | "open" | "closing";

export interface Door {
	readonly cx: number;
	readonly cy: number;
	/** Keycard required, or null for a plain door. */
	readonly key: KeyColor | null;
	/** 0 = shut, 1 = fully slid aside. */
	openness: number;
	state: DoorState;
	/** Seconds the door stays open before it closes again. */
	timer: number;
}

export interface LevelDef {
	readonly name: string;
	/** Par time in seconds, shown on the intermission screen. */
	readonly par: number;
	readonly floor: TextureName;
	readonly altFloor: TextureName;
	readonly ceiling: TextureName;
	/** Base light level for the level, 0..15. */
	readonly light: number;
	/** Flavour line shown while the level loads. */
	readonly briefing: string;
	readonly rows: readonly string[];
}

export interface Spawn {
	readonly kind: string;
	readonly x: number;
	readonly y: number;
}

const WALLS: Record<string, TextureName> = {
	"#": "techPanel",
	"|": "techPipe",
	B: "brick",
	S: "stone",
	M: "marble",
	T: "metal",
	R: "rust",
	C: "circuit",
	F: "flesh",
};

const DOORS: Record<string, KeyColor | null> = {
	"=": null,
	r: "red",
	b: "blue",
	y: "yellow",
};

const DOOR_TEX: Record<string, TextureName> = {
	"=": "door",
	r: "doorRed",
	b: "doorBlue",
	y: "doorYellow",
};

/** Floor-only cells: the character picks the surface under your feet. */
const FLOORS: Record<string, "default" | "alt" | "grate" | "lava"> = {
	".": "default",
	" ": "default",
	",": "alt",
	_: "grate",
	"~": "lava",
	"*": "default",
	"!": "default",
};

/** Characters that place a thing on an otherwise ordinary floor cell. */
const THINGS: Record<string, string> = {
	"@": "player",
	"1": "grunt",
	"2": "hound",
	"3": "imp",
	"4": "brute",
	h: "medkit",
	i: "stimpack",
	a: "armor",
	c: "clip",
	s: "shells",
	g: "shotgun",
	G: "chaingun",
	K: "keyRed",
	J: "keyBlue",
	Y: "keyYellow",
	o: "barrel",
	p: "column",
	l: "lamp",
	x: "gore",
};

export class GameMap {
	readonly width: number;
	readonly height: number;
	readonly def: LevelDef;

	/** 1 when the cell blocks movement and sight (doors: when shut). */
	readonly solid: Uint8Array;
	readonly wallTex: Uint8Array;
	readonly floorTex: Uint8Array;
	readonly ceilTex: Uint8Array;
	readonly flags: Uint8Array;
	readonly light: Uint8Array;
	/** Index into `doors`, or -1. */
	readonly doorIndex: Int16Array;
	/** Cells the player has seen, for the automap. */
	readonly seen: Uint8Array;

	readonly doors: Door[] = [];
	/** Texture names in the order the renderer indexes them. */
	readonly textureNames: TextureName[] = [];

	readonly spawns: Spawn[] = [];
	readonly playerStart = { x: 1.5, y: 1.5, angle: 0 };
	/** Number of `!` cells — the level's secret count. */
	secretTotal = 0;

	private texIndex = new Map<TextureName, number>();

	constructor(def: LevelDef) {
		this.def = def;
		this.height = def.rows.length;
		this.width = Math.max(...def.rows.map((r) => r.length));
		const n = this.width * this.height;
		this.solid = new Uint8Array(n);
		this.wallTex = new Uint8Array(n);
		this.floorTex = new Uint8Array(n);
		this.ceilTex = new Uint8Array(n);
		this.flags = new Uint8Array(n);
		this.light = new Uint8Array(n).fill(def.light);
		this.doorIndex = new Int16Array(n).fill(-1);
		this.seen = new Uint8Array(n);

		const floorId = this.textureId(def.floor);
		const altId = this.textureId(def.altFloor);
		const grateId = this.textureId("floorGrate");
		const lavaId = this.textureId("floorLava");
		const ceilId = this.textureId(def.ceiling);
		const lightId = this.textureId("ceilLight");

		for (let cy = 0; cy < this.height; cy++) {
			const row = def.rows[cy];
			for (let cx = 0; cx < this.width; cx++) {
				const i = cy * this.width + cx;
				const char = row[cx] ?? "#";
				this.floorTex[i] = floorId;
				this.ceilTex[i] = ceilId;

				const wall = WALLS[char];
				if (wall) {
					this.solid[i] = 1;
					this.wallTex[i] = this.textureId(wall);
					continue;
				}

				if (char === "X") {
					this.solid[i] = 1;
					this.flags[i] |= CELL_EXIT;
					this.wallTex[i] = this.textureId("exitSwitch");
					continue;
				}

				if (char in DOORS) {
					this.solid[i] = 1;
					this.wallTex[i] = this.textureId(DOOR_TEX[char]);
					this.doorIndex[i] = this.doors.length;
					this.doors.push({
						cx,
						cy,
						key: DOORS[char],
						openness: 0,
						state: "closed",
						timer: 0,
					});
					continue;
				}

				// Everything else is walkable floor, optionally with a thing on it.
				const surface = FLOORS[char] ?? "default";
				if (surface === "alt") this.floorTex[i] = altId;
				else if (surface === "grate") this.floorTex[i] = grateId;
				else if (surface === "lava") {
					this.floorTex[i] = lavaId;
					this.flags[i] |= CELL_HURT;
					this.light[i] = Math.min(15, def.light + 4);
				}

				if (char === "*") {
					// Lit ceiling panel: brighter here and in the cells around it.
					this.ceilTex[i] = lightId;
					this.light[i] = 15;
					for (let dy = -1; dy <= 1; dy++) {
						for (let dx = -1; dx <= 1; dx++) {
							const j = (cy + dy) * this.width + (cx + dx);
							if (j >= 0 && j < n) {
								this.light[j] = Math.max(this.light[j], 13);
							}
						}
					}
				}

				if (char === "!") {
					this.flags[i] |= CELL_SECRET;
					this.secretTotal++;
				}

				const thing = THINGS[char];
				if (thing === "player") {
					this.playerStart.x = cx + 0.5;
					this.playerStart.y = cy + 0.5;
				} else if (thing) {
					this.spawns.push({ kind: thing, x: cx + 0.5, y: cy + 0.5 });
				}
			}
		}

		this.playerStart.angle = this.pickStartAngle();
	}

	private textureId(name: TextureName): number {
		const existing = this.texIndex.get(name);
		if (existing !== undefined) return existing;
		const id = this.textureNames.length;
		this.textureNames.push(name);
		this.texIndex.set(name, id);
		return id;
	}

	/** Face whichever cardinal direction has the most room ahead. */
	private pickStartAngle(): number {
		const { x, y } = this.playerStart;
		let best = 0;
		let bestDist = -1;
		for (let i = 0; i < 4; i++) {
			const angle = (i * Math.PI) / 2;
			const dx = Math.cos(angle);
			const dy = Math.sin(angle);
			let d = 0;
			while (d < 12 && !this.isSolid(x + dx * (d + 0.5), y + dy * (d + 0.5))) d++;
			if (d > bestDist) {
				bestDist = d;
				best = angle;
			}
		}
		return best;
	}

	inBounds(cx: number, cy: number): boolean {
		return cx >= 0 && cy >= 0 && cx < this.width && cy < this.height;
	}

	index(cx: number, cy: number): number {
		return cy * this.width + cx;
	}

	/** Blocks movement? World coordinates. Doors count until nearly open. */
	isSolid(x: number, y: number): boolean {
		const cx = Math.floor(x);
		const cy = Math.floor(y);
		if (!this.inBounds(cx, cy)) return true;
		const i = cy * this.width + cx;
		if (!this.solid[i]) return false;
		const door = this.doorIndex[i];
		if (door >= 0) return this.doors[door].openness < 0.85;
		return true;
	}

	/** Blocks a bullet or a line of sight? Doors block until half open. */
	blocksSight(cx: number, cy: number): boolean {
		if (!this.inBounds(cx, cy)) return true;
		const i = cy * this.width + cx;
		if (!this.solid[i]) return false;
		const door = this.doorIndex[i];
		if (door >= 0) return this.doors[door].openness < 0.55;
		return true;
	}

	flagsAt(x: number, y: number): number {
		const cx = Math.floor(x);
		const cy = Math.floor(y);
		if (!this.inBounds(cx, cy)) return 0;
		return this.flags[cy * this.width + cx];
	}

	lightAt(x: number, y: number): number {
		const cx = Math.floor(x);
		const cy = Math.floor(y);
		if (!this.inBounds(cx, cy)) return this.def.light;
		return this.light[cy * this.width + cx];
	}

	doorAt(cx: number, cy: number): Door | null {
		if (!this.inBounds(cx, cy)) return null;
		const idx = this.doorIndex[cy * this.width + cx];
		return idx >= 0 ? this.doors[idx] : null;
	}

	markSeen(cx: number, cy: number): void {
		if (this.inBounds(cx, cy)) this.seen[cy * this.width + cx] = 1;
	}

	/** Advance every door. Doors auto-close after sitting open a while. */
	updateDoors(dt: number, blocked: (door: Door) => boolean): void {
		for (const door of this.doors) {
			switch (door.state) {
				case "opening":
					door.openness = Math.min(1, door.openness + dt * 1.4);
					if (door.openness >= 1) {
						door.state = "open";
						door.timer = 4.5;
					}
					break;
				case "open":
					door.timer -= dt;
					// Never crush whoever is standing in the doorway.
					if (door.timer <= 0 && !blocked(door)) door.state = "closing";
					break;
				case "closing":
					if (blocked(door)) {
						door.state = "opening";
						break;
					}
					door.openness = Math.max(0, door.openness - dt * 1.1);
					if (door.openness <= 0) door.state = "closed";
					break;
				case "closed":
					break;
			}
		}
	}
}
