import type { Audio } from "../engine/Audio";
import { randInt, randRange } from "../engine/rng";
import {
	CELL_EXIT,
	CELL_HURT,
	CELL_SECRET,
	GameMap,
	type Door,
	type KeyColor,
	type LevelDef,
} from "./map";
import {
	BARREL_DAMAGE,
	BARREL_RADIUS,
	ITEMS,
	MONSTERS,
	PROPS,
	isItemKind,
	isMonsterKind,
	isPropKind,
	type ItemKind,
	type MonsterDef,
	type MonsterKind,
	type PropKind,
} from "./things";
import { MAX_AMMO, WEAPONS, WEAPON_ORDER, type WeaponId } from "./weapons";

/**
 * The simulation: map, player, monsters, items, projectiles and the combat that
 * connects them. Rendering reads this and never writes to it.
 *
 * Everything advances on the fixed step from `Loop`, so a shot fired on tick N
 * resolves identically regardless of frame rate.
 */

export type EntityType = "monster" | "item" | "prop" | "projectile" | "effect";

export type AiState = "idle" | "chase" | "windup" | "cooldown" | "pain" | "dead";

export interface Entity {
	id: number;
	type: EntityType;
	kind: string;
	x: number;
	y: number;
	/** Height of the sprite's base above the floor — projectiles fly. */
	z: number;
	radius: number;
	/** Sprite world height in cells. */
	height: number;
	/** Sprite strip key, e.g. "grunt.walk". */
	anim: string;
	/** Seconds spent in the current strip, converted to a frame at draw time. */
	animTime: number;
	/** Frames per second for the current strip. */
	animFps: number;
	/** When false the strip holds on its last frame instead of looping. */
	animLoop: boolean;
	health: number;
	dead: boolean;
	removed: boolean;
	/** Blocks player and monster movement. */
	solid: boolean;
	/** Monsters only. */
	ai?: {
		def: MonsterDef;
		state: AiState;
		timer: number;
		/** Seconds until the next attack is allowed. */
		cooldown: number;
		alerted: boolean;
		/** Remaining shots in a burst (brute). */
		burst: number;
		/** Randomised strafe direction while chasing, so they don't conga-line. */
		drift: number;
		driftTimer: number;
	};
	/** Projectiles only. */
	vx?: number;
	vy?: number;
	damage?: number;
	/** Seconds before an effect removes itself. */
	life?: number;
}

export interface PlayerState {
	x: number;
	y: number;
	angle: number;
	/** Vertical look, in framebuffer rows of horizon shift. */
	pitch: number;
	health: number;
	armor: number;
	bullets: number;
	shells: number;
	keys: Set<KeyColor>;
	weapon: WeaponId;
	owned: Set<WeaponId>;
	dead: boolean;
	/** Walk-cycle phase, drives view bob. */
	bob: number;
	/** 0..1, decays — tints the screen red when hit. */
	painFlash: number;
	/** 0..1, decays — tints the screen gold on pickup. */
	pickupFlash: number;
	/** 0..1, decays — muzzle flash lighting the room. */
	muzzleFlash: number;
	/** Downward view kick from firing, in pixels. */
	kick: number;
}

export interface WeaponState {
	phase: "idle" | "firing" | "refire" | "raising" | "lowering";
	timer: number;
	frame: number;
	/** Chaingun alternates barrels between shots. */
	toggle: boolean;
	/** Weapon being switched to while lowering. */
	pending: WeaponId | null;
	/**
	 * Cleared when a shot goes off, set again the moment the trigger is let go.
	 * Non-automatic weapons need it back before they will fire, which is what
	 * makes the pistol and shotgun one-shot-per-click.
	 */
	triggerReleased: boolean;
}

export interface LevelStats {
	kills: number;
	killsTotal: number;
	items: number;
	itemsTotal: number;
	secrets: number;
	secretsTotal: number;
	time: number;
	score: number;
}

/** What the player is asking the world to do this step. */
export interface PlayerCommand {
	forward: number;
	strafe: number;
	/** Radians already scaled by sensitivity. */
	turn: number;
	pitch: number;
	run: boolean;
	fire: boolean;
	use: boolean;
	selectWeapon: WeaponId | null;
	cycleWeapon: number;
}

/** 8-way offsets, so a wall diagonally across a doorway still reveals. */
const NEIGHBOURS: readonly (readonly [number, number])[] = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1],
	[1, 1],
	[1, -1],
	[-1, 1],
	[-1, -1],
];

const PLAYER_RADIUS = 0.28;
const WALK_SPEED = 3.1;
const RUN_SPEED = 5.2;
const ACCEL = 22;
const FRICTION = 14;
const MAX_HEALTH = 100;
const MAX_ARMOR = 100;
/** Armor soaks a third of incoming damage, DOOM's green-armor rule. */
const ARMOR_ABSORB = 1 / 3;

export class World {
	readonly map: GameMap;
	readonly entities: Entity[] = [];
	readonly player: PlayerState;
	readonly weapon: WeaponState = {
		phase: "idle",
		timer: 0,
		frame: 0,
		toggle: false,
		pending: null,
		triggerReleased: true,
	};
	readonly stats: LevelStats;

	/** Set once the exit switch has been thrown. */
	exited = false;
	/** Most recent HUD line and how long it has left on screen. */
	message = "";
	messageTimer = 0;

	private audio: Audio;
	private nextId = 1;
	private vx = 0;
	private vy = 0;
	private lavaTimer = 0;

	constructor(def: LevelDef, audio: Audio, carry?: Partial<PlayerState>) {
		this.map = new GameMap(def);
		this.audio = audio;

		this.player = {
			x: this.map.playerStart.x,
			y: this.map.playerStart.y,
			angle: this.map.playerStart.angle,
			pitch: 0,
			health: carry?.health ?? MAX_HEALTH,
			armor: carry?.armor ?? 0,
			bullets: carry?.bullets ?? 50,
			shells: carry?.shells ?? 0,
			// Keys never carry between levels — each level's locks are its own.
			keys: new Set(),
			weapon: carry?.weapon ?? "pistol",
			owned: new Set(carry?.owned ?? ["fist", "pistol"]),
			dead: false,
			bob: 0,
			painFlash: 0,
			pickupFlash: 0,
			muzzleFlash: 0,
			kick: 0,
		};

		this.stats = {
			kills: 0,
			killsTotal: 0,
			items: 0,
			itemsTotal: 0,
			secrets: 0,
			secretsTotal: this.map.secretTotal,
			time: 0,
			score: 0,
		};

		this.spawnThings();
		this.message = def.briefing;
		this.messageTimer = 4;
	}

	private spawnThings(): void {
		for (const spawn of this.map.spawns) {
			if (isMonsterKind(spawn.kind)) {
				this.spawnMonster(spawn.kind, spawn.x, spawn.y);
				this.stats.killsTotal++;
			} else if (isItemKind(spawn.kind)) {
				this.spawnItem(spawn.kind, spawn.x, spawn.y);
				this.stats.itemsTotal++;
			} else if (isPropKind(spawn.kind)) {
				this.spawnProp(spawn.kind, spawn.x, spawn.y);
			}
		}
	}

	private spawnMonster(kind: MonsterKind, x: number, y: number): Entity {
		const def = MONSTERS[kind];
		const e: Entity = {
			id: this.nextId++,
			type: "monster",
			kind,
			x,
			y,
			z: 0,
			radius: def.radius,
			height: def.height,
			anim: `${def.sprite}.${def.moveAnim}`,
			animTime: randRange(0, 1),
			animFps: 6,
			animLoop: true,
			health: def.health,
			dead: false,
			removed: false,
			solid: true,
			ai: {
				def,
				state: "idle",
				timer: 0,
				cooldown: 0,
				alerted: false,
				burst: 0,
				drift: Math.random() < 0.5 ? -1 : 1,
				driftTimer: 0,
			},
		};
		this.entities.push(e);
		return e;
	}

	private spawnItem(kind: ItemKind, x: number, y: number): void {
		const def = ITEMS[kind];
		this.entities.push({
			id: this.nextId++,
			type: "item",
			kind,
			x,
			y,
			z: 0,
			radius: 0.35,
			height: def.height,
			anim: def.sprite,
			animTime: 0,
			animFps: 0,
			animLoop: true,
			health: 0,
			dead: false,
			removed: false,
			solid: false,
		});
	}

	private spawnProp(kind: PropKind, x: number, y: number): void {
		const def = PROPS[kind];
		this.entities.push({
			id: this.nextId++,
			type: "prop",
			kind,
			x,
			y,
			z: 0,
			radius: def.radius,
			height: def.height,
			anim: def.sprite,
			animTime: 0,
			animFps: 0,
			animLoop: true,
			health: def.health ?? 0,
			dead: false,
			removed: false,
			solid: def.solid,
		});
	}

	private spawnEffect(anim: string, x: number, y: number, z: number, frames: number, fps: number): void {
		this.entities.push({
			id: this.nextId++,
			type: "effect",
			kind: anim,
			x,
			y,
			z,
			radius: 0,
			height: anim === "fx.explosion" ? 1.1 : 0.35,
			anim,
			animTime: 0,
			animFps: fps,
			animLoop: false,
			health: 0,
			dead: false,
			removed: false,
			solid: false,
			life: frames / fps,
		});
	}

	private spawnFireball(from: Entity, tx: number, ty: number, damage: number): void {
		const dx = tx - from.x;
		const dy = ty - from.y;
		const len = Math.hypot(dx, dy) || 1;
		const speed = 6.5;
		this.entities.push({
			id: this.nextId++,
			type: "projectile",
			kind: "fireball",
			x: from.x + (dx / len) * (from.radius + 0.15),
			y: from.y + (dy / len) * (from.radius + 0.15),
			z: from.height * 0.55,
			radius: 0.16,
			height: 0.3,
			anim: "fx.fireball",
			animTime: 0,
			animFps: 12,
			animLoop: true,
			health: 0,
			dead: false,
			removed: false,
			solid: false,
			vx: (dx / len) * speed,
			vy: (dy / len) * speed,
			damage,
		});
	}

	/* ── Main step ──────────────────────────────────────────────────────── */

	update(dt: number, cmd: PlayerCommand): void {
		this.stats.time += dt;
		if (this.messageTimer > 0) this.messageTimer -= dt;

		this.updatePlayer(dt, cmd);
		this.updateWeapon(dt, cmd);
		this.updateEntities(dt);
		this.map.updateDoors(dt, (door) => this.doorBlocked(door));
		this.updateVisibility();

		const p = this.player;
		p.painFlash = Math.max(0, p.painFlash - dt * 2.2);
		p.pickupFlash = Math.max(0, p.pickupFlash - dt * 3);
		p.muzzleFlash = Math.max(0, p.muzzleFlash - dt * 9);
		p.kick += (0 - p.kick) * Math.min(1, dt * 11);

		// Compact the entity list once per step rather than splicing mid-iteration.
		for (let i = this.entities.length - 1; i >= 0; i--) {
			if (this.entities[i].removed) this.entities.splice(i, 1);
		}
	}

	private updatePlayer(dt: number, cmd: PlayerCommand): void {
		const p = this.player;
		if (p.dead) {
			// Dead players still slide to a halt and can look around.
			this.vx *= 1 - Math.min(1, dt * FRICTION);
			this.vy *= 1 - Math.min(1, dt * FRICTION);
			this.moveWithCollision(p, this.vx * dt, this.vy * dt, PLAYER_RADIUS);
			return;
		}

		p.angle += cmd.turn;
		if (p.angle > Math.PI) p.angle -= Math.PI * 2;
		if (p.angle < -Math.PI) p.angle += Math.PI * 2;
		p.pitch = Math.max(-60, Math.min(60, p.pitch + cmd.pitch));

		const speed = cmd.run ? RUN_SPEED : WALK_SPEED;
		const cos = Math.cos(p.angle);
		const sin = Math.sin(p.angle);
		// Forward is (cos, sin); the player's right is the renderer's camera
		// plane, (-sin, cos) — the direction the ray at the right edge of the
		// screen leans toward. Strafe has to use that exact vector or D walks
		// toward the left of the screen.
		let fx = cos * cmd.forward - sin * cmd.strafe;
		let fy = sin * cmd.forward + cos * cmd.strafe;
		const mag = Math.hypot(fx, fy);
		if (mag > 1) {
			fx /= mag;
			fy /= mag;
		}

		const targetX = fx * speed;
		const targetY = fy * speed;
		const rate = mag > 0.01 ? ACCEL : FRICTION;
		this.vx += (targetX - this.vx) * Math.min(1, dt * rate);
		this.vy += (targetY - this.vy) * Math.min(1, dt * rate);

		this.moveWithCollision(p, this.vx * dt, this.vy * dt, PLAYER_RADIUS);

		const moving = Math.hypot(this.vx, this.vy);
		p.bob += dt * moving * 2.4;

		this.checkPickups();
		this.checkFloor(dt);

		if (cmd.use) this.tryUse();
	}

	/** Lava burns while you stand in it, on a timer rather than per-step. */
	private checkFloor(dt: number): void {
		const p = this.player;
		if ((this.map.flagsAt(p.x, p.y) & CELL_HURT) === 0) {
			this.lavaTimer = 0;
			return;
		}
		this.lavaTimer -= dt;
		if (this.lavaTimer <= 0) {
			this.lavaTimer = 0.45;
			this.damagePlayer(randInt(4, 8), true);
		}
	}

	private updateVisibility(): void {
		const p = this.player;
		const cx = Math.floor(p.x);
		const cy = Math.floor(p.y);
		const map = this.map;

		// Mark a small neighbourhood seen — the automap fills in as you walk.
		for (let dy = -4; dy <= 4; dy++) {
			for (let dx = -4; dx <= 4; dx++) {
				if (dx * dx + dy * dy > 20) continue;
				const tx = cx + dx;
				const ty = cy + dy;
				if (map.inBounds(tx, ty) && this.lineOfSight(p.x, p.y, tx + 0.5, ty + 0.5)) {
					map.markSeen(tx, ty);
				}
			}
		}

		// A wall's own centre is never in line of sight — the wall blocks the
		// ray — so walls would never appear on the automap. Reveal any solid
		// cell that borders open floor the player has now seen.
		for (let dy = -5; dy <= 5; dy++) {
			for (let dx = -5; dx <= 5; dx++) {
				const tx = cx + dx;
				const ty = cy + dy;
				if (!map.inBounds(tx, ty)) continue;
				const i = map.index(tx, ty);
				if (!map.solid[i] || map.seen[i]) continue;
				for (const [ox, oy] of NEIGHBOURS) {
					const nx = tx + ox;
					const ny = ty + oy;
					if (!map.inBounds(nx, ny)) continue;
					const j = map.index(nx, ny);
					if (!map.solid[j] && map.seen[j]) {
						map.seen[i] = 1;
						break;
					}
				}
			}
		}

		const flags = this.map.flagsAt(p.x, p.y);
		if (flags & CELL_SECRET) {
			const i = this.map.index(cx, cy);
			// Clear the bit so a secret only ever counts once.
			this.map.flags[i] &= ~CELL_SECRET;
			this.stats.secrets++;
			this.stats.score += 500;
			this.audio.play("secret");
			this.setMessage("a secret is revealed");
		}
	}

	/* ── Movement and collision ─────────────────────────────────────────── */

	/**
	 * Axis-separated sliding collision: try X, then Y. Hitting a corner at an
	 * angle then slides along the wall instead of stopping dead, which is what
	 * makes running through doorways feel right.
	 */
	private moveWithCollision(
		body: { x: number; y: number },
		dx: number,
		dy: number,
		radius: number,
		ignore?: Entity,
	): void {
		if (dx !== 0) {
			const nx = body.x + dx;
			if (!this.blocked(nx, body.y, radius, ignore)) body.x = nx;
			else if (body === this.player) this.vx = 0;
		}
		if (dy !== 0) {
			const ny = body.y + dy;
			if (!this.blocked(body.x, ny, radius, ignore)) body.y = ny;
			else if (body === this.player) this.vy = 0;
		}
	}

	private blocked(x: number, y: number, radius: number, ignore?: Entity): boolean {
		// Sample the four extremes of the bounding circle against the grid.
		if (
			this.map.isSolid(x - radius, y) ||
			this.map.isSolid(x + radius, y) ||
			this.map.isSolid(x, y - radius) ||
			this.map.isSolid(x, y + radius) ||
			this.map.isSolid(x - radius * 0.7, y - radius * 0.7) ||
			this.map.isSolid(x + radius * 0.7, y - radius * 0.7) ||
			this.map.isSolid(x - radius * 0.7, y + radius * 0.7) ||
			this.map.isSolid(x + radius * 0.7, y + radius * 0.7)
		) {
			return true;
		}
		for (const e of this.entities) {
			if (!e.solid || e.removed || e.dead || e === ignore) continue;
			const rr = radius + e.radius;
			if ((e.x - x) ** 2 + (e.y - y) ** 2 < rr * rr) return true;
		}
		return false;
	}

	private doorBlocked(door: Door): boolean {
		const p = this.player;
		if (Math.floor(p.x) === door.cx && Math.floor(p.y) === door.cy) return true;
		for (const e of this.entities) {
			if (e.removed || !e.solid || e.dead) continue;
			if (Math.floor(e.x) === door.cx && Math.floor(e.y) === door.cy) return true;
		}
		return false;
	}

	/* ── Raycasting helpers ─────────────────────────────────────────────── */

	/**
	 * Distance from (x, y) along (dx, dy) to the first sight-blocking wall, or
	 * `max` if nothing is hit. Standard grid DDA — the same walk the renderer
	 * does, kept separate so gameplay never depends on render state.
	 */
	castRay(x: number, y: number, dx: number, dy: number, max: number): number {
		let cx = Math.floor(x);
		let cy = Math.floor(y);
		const stepX = dx < 0 ? -1 : 1;
		const stepY = dy < 0 ? -1 : 1;
		const deltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
		const deltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
		let sideX = dx === 0 ? Infinity : (dx < 0 ? x - cx : cx + 1 - x) * deltaX;
		let sideY = dy === 0 ? Infinity : (dy < 0 ? y - cy : cy + 1 - y) * deltaY;

		for (let guard = 0; guard < 512; guard++) {
			let dist: number;
			if (sideX < sideY) {
				dist = sideX;
				sideX += deltaX;
				cx += stepX;
			} else {
				dist = sideY;
				sideY += deltaY;
				cy += stepY;
			}
			if (dist > max) return max;
			if (this.map.blocksSight(cx, cy)) return dist;
		}
		return max;
	}

	lineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
		const dx = x1 - x0;
		const dy = y1 - y0;
		const dist = Math.hypot(dx, dy);
		if (dist < 0.001) return true;
		return this.castRay(x0, y0, dx / dist, dy / dist, dist) >= dist - 0.001;
	}

	/**
	 * Nearest shootable entity along a ray. Uses closest-approach rather than
	 * marching: one pass over the entity list instead of hundreds of samples,
	 * which matters when the shotgun fires seven pellets a shot.
	 */
	private hitscanEntity(
		x: number,
		y: number,
		dx: number,
		dy: number,
		maxDist: number,
		shooter: Entity | null,
	): { entity: Entity; dist: number } | null {
		let best: Entity | null = null;
		let bestDist = maxDist;
		for (const e of this.entities) {
			if (e.removed || e === shooter) continue;
			const shootable =
				(e.type === "monster" && !e.dead) ||
				(e.type === "prop" && PROPS[e.kind as PropKind]?.explodes && !e.dead);
			if (!shootable) continue;

			const ox = e.x - x;
			const oy = e.y - y;
			const along = ox * dx + oy * dy;
			if (along <= 0 || along >= bestDist) continue;
			const perp = Math.abs(ox * dy - oy * dx);
			if (perp > e.radius) continue;
			best = e;
			bestDist = along;
		}
		return best ? { entity: best, dist: bestDist } : null;
	}

	/* ── Player weapons ─────────────────────────────────────────────────── */

	private updateWeapon(dt: number, cmd: PlayerCommand): void {
		const w = this.weapon;
		const p = this.player;
		if (p.dead) {
			w.phase = "idle";
			w.frame = 0;
			return;
		}

		const requested = cmd.selectWeapon ?? this.cycleTarget(cmd.cycleWeapon);
		if (requested && requested !== p.weapon && p.owned.has(requested) && w.phase === "idle") {
			w.phase = "lowering";
			w.pending = requested;
			w.timer = 0.12;
		}

		w.timer -= dt;
		if (!cmd.fire) w.triggerReleased = true;
		const def = WEAPONS[p.weapon];
		const wantsToShoot =
			cmd.fire && (def.auto || w.triggerReleased) && this.canFire(def.id);

		switch (w.phase) {
			case "lowering":
				if (w.timer <= 0) {
					if (w.pending) p.weapon = w.pending;
					w.pending = null;
					w.phase = "raising";
					w.timer = 0.12;
				}
				break;
			case "raising":
				if (w.timer <= 0) {
					w.phase = "idle";
					w.frame = 0;
				}
				break;
			case "idle":
				w.frame = def.frames.idle;
				if (wantsToShoot) {
					w.phase = "firing";
					w.timer = def.fireDelay;
					w.frame = def.frames.fire;
					w.triggerReleased = false;
				}
				break;
			case "firing":
				if (w.timer <= 0) {
					this.fireWeapon(def.id);
					w.phase = "refire";
					w.timer = def.refire;
					w.frame = def.frames.recover;
				}
				break;
			case "refire":
				if (w.timer <= 0) {
					w.phase = "idle";
					w.frame = def.frames.idle;
				} else if (def.pumpFrames) {
					// Shotgun: step through the pump over the back half of the delay.
					const t = 1 - w.timer / def.refire;
					const i = Math.min(
						def.pumpFrames.length - 1,
						Math.floor(t * def.pumpFrames.length * 1.4),
					);
					w.frame = def.pumpFrames[i];
				}
				break;
		}
	}

	private cycleTarget(dir: number): WeaponId | null {
		if (dir === 0) return null;
		const owned = WEAPON_ORDER.filter((id) => this.player.owned.has(id));
		if (owned.length < 2) return null;
		const at = owned.indexOf(this.player.weapon);
		const next = (at + (dir > 0 ? 1 : -1) + owned.length) % owned.length;
		return owned[next];
	}

	private canFire(id: WeaponId): boolean {
		const def = WEAPONS[id];
		if (!def.ammo) return true;
		return this.player[def.ammo] >= def.ammoPerShot;
	}

	private fireWeapon(id: WeaponId): void {
		const def = WEAPONS[id];
		const p = this.player;
		if (!this.canFire(id)) return;
		if (def.ammo) p[def.ammo] -= def.ammoPerShot;

		this.audio.play(def.sound);
		p.kick = def.kick;
		p.muzzleFlash = def.flash > 0 ? 1 : 0;
		if (id === "chaingun") this.weapon.toggle = !this.weapon.toggle;

		for (let i = 0; i < def.pellets; i++) {
			const spread = def.spread > 0 ? randRange(-def.spread, def.spread) : 0;
			const angle = p.angle + spread;
			const dx = Math.cos(angle);
			const dy = Math.sin(angle);
			const wallDist = this.castRay(p.x, p.y, dx, dy, def.range);
			const hit = this.hitscanEntity(p.x, p.y, dx, dy, wallDist, null);
			const damage = randInt(def.damage[0], def.damage[1]);

			if (hit) {
				const hx = p.x + dx * hit.dist;
				const hy = p.y + dy * hit.dist;
				this.spawnEffect("fx.blood", hx, hy, hit.entity.height * 0.5, 3, 18);
				this.damageEntity(hit.entity, damage);
			} else if (wallDist < def.range) {
				const hx = p.x + dx * (wallDist - 0.02);
				const hy = p.y + dy * (wallDist - 0.02);
				this.spawnEffect("fx.spark", hx, hy, 0.5, 3, 20);
				if (i === 0) this.audio.playAt("hitwall", wallDist, 0.5);
			}
		}

		// Gunfire wakes anything that can hear it, not just what can see it.
		this.alertNearby(p.x, p.y, id === "fist" ? 3 : 13);
	}

	private alertNearby(x: number, y: number, radius: number): void {
		for (const e of this.entities) {
			if (e.type !== "monster" || e.dead || e.removed || !e.ai || e.ai.alerted) continue;
			if ((e.x - x) ** 2 + (e.y - y) ** 2 > radius * radius) continue;
			this.wake(e);
		}
	}

	private wake(e: Entity): void {
		if (!e.ai || e.ai.alerted) return;
		e.ai.alerted = true;
		e.ai.state = "chase";
		this.audio.playAt(e.ai.def.alertSound, this.distanceToPlayer(e));
	}

	/* ── Use / doors / exit ─────────────────────────────────────────────── */

	private tryUse(): void {
		const p = this.player;
		const dx = Math.cos(p.angle);
		const dy = Math.sin(p.angle);
		// Probe a short way ahead so you can open a door you're standing against
		// as well as one you're a stride short of.
		for (const reach of [0.55, 0.95, 1.35, 1.75]) {
			const cx = Math.floor(p.x + dx * reach);
			const cy = Math.floor(p.y + dy * reach);
			if (!this.map.inBounds(cx, cy)) continue;
			const i = this.map.index(cx, cy);

			if (this.map.flags[i] & CELL_EXIT) {
				if (!this.exited) {
					this.exited = true;
					this.audio.play("exit");
					this.setMessage("exit reached");
				}
				return;
			}

			const door = this.map.doorAt(cx, cy);
			if (door) {
				this.useDoor(door);
				return;
			}
		}
	}

	private useDoor(door: Door): void {
		if (door.key && !this.player.keys.has(door.key)) {
			this.audio.play("doorLocked");
			this.setMessage(`you need the ${door.key} keycard`);
			return;
		}
		if (door.state === "closed" || door.state === "closing") {
			door.state = "opening";
			this.audio.playAt("doorOpen", this.distanceTo(door.cx + 0.5, door.cy + 0.5));
		} else if (door.state === "open") {
			// Tapping use on an open door shuts it early.
			door.timer = 0;
		}
	}

	/* ── Pickups ────────────────────────────────────────────────────────── */

	private checkPickups(): void {
		const p = this.player;
		for (const e of this.entities) {
			if (e.type !== "item" || e.removed) continue;
			if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > 0.42 * 0.42) continue;
			const def = ITEMS[e.kind as ItemKind];
			if (!def) continue;

			// Health and ammo pickups are refused when they'd be wasted, so you
			// can leave a medkit on the floor until you actually need it.
			const wantsHealth = def.health !== undefined && p.health < MAX_HEALTH;
			const wantsArmor = def.armor !== undefined && p.armor < MAX_ARMOR;
			const wantsBullets = def.bullets !== undefined && p.bullets < MAX_AMMO.bullets;
			const wantsShells = def.shells !== undefined && p.shells < MAX_AMMO.shells;
			const wantsWeapon = def.weapon !== undefined && !p.owned.has(def.weapon);
			const wantsKey = def.key !== undefined && !p.keys.has(def.key);
			if (!wantsHealth && !wantsArmor && !wantsBullets && !wantsShells && !wantsWeapon && !wantsKey) {
				continue;
			}

			if (def.health) p.health = Math.min(MAX_HEALTH, p.health + def.health);
			if (def.armor) p.armor = Math.min(MAX_ARMOR, p.armor + def.armor);
			if (def.bullets) p.bullets = Math.min(MAX_AMMO.bullets, p.bullets + def.bullets);
			if (def.shells) p.shells = Math.min(MAX_AMMO.shells, p.shells + def.shells);
			if (def.key) p.keys.add(def.key);
			if (def.weapon) {
				p.owned.add(def.weapon);
				// Switching to a weapon you just found is what you always want.
				if (this.weapon.phase === "idle") {
					this.weapon.phase = "lowering";
					this.weapon.pending = def.weapon;
					this.weapon.timer = 0.12;
				}
			}

			e.removed = true;
			this.stats.items++;
			this.stats.score += 50;
			p.pickupFlash = 1;
			this.audio.play(def.sound);
			this.setMessage(def.message);
		}
	}

	/* ── Damage ─────────────────────────────────────────────────────────── */

	damagePlayer(amount: number, ignoreArmor = false): void {
		const p = this.player;
		if (p.dead || amount <= 0) return;
		let remaining = amount;
		if (!ignoreArmor && p.armor > 0) {
			const absorbed = Math.min(p.armor, Math.ceil(amount * ARMOR_ABSORB));
			p.armor -= absorbed;
			remaining -= absorbed;
		}
		p.health -= remaining;
		p.painFlash = Math.min(1, p.painFlash + 0.35 + amount / 60);

		if (p.health <= 0) {
			p.health = 0;
			p.dead = true;
			this.audio.play("playerDeath");
			this.setMessage("you died");
		} else {
			this.audio.play("playerPain", 0.8);
		}
	}

	damageEntity(e: Entity, amount: number): void {
		if (e.removed || e.dead || amount <= 0) return;
		e.health -= amount;

		if (e.type === "prop") {
			if (e.health <= 0) this.explodeBarrel(e);
			return;
		}
		if (!e.ai) return;

		if (e.health <= 0) {
			e.dead = true;
			e.solid = false;
			e.ai.state = "dead";
			e.anim = `${e.ai.def.sprite}.${e.ai.def.deathAnim}`;
			e.animTime = 0;
			e.animFps = 9;
			e.animLoop = false;
			this.stats.kills++;
			this.stats.score += e.ai.def.scoreValue;
			this.audio.playAt("enemyDeath", this.distanceToPlayer(e));
			return;
		}

		this.wake(e);
		if (Math.random() < e.ai.def.painChance) {
			e.ai.state = "pain";
			e.ai.timer = 0.28;
			e.anim = `${e.ai.def.sprite}.${e.ai.def.painAnim}`;
			e.animTime = 0;
			e.animLoop = false;
			this.audio.playAt("enemyPain", this.distanceToPlayer(e));
		}
	}

	private explodeBarrel(e: Entity): void {
		e.dead = true;
		e.removed = true;
		this.spawnEffect("fx.explosion", e.x, e.y, 0.2, 5, 14);
		this.audio.playAt("explode", this.distanceToPlayer(e));

		const px = this.player.x - e.x;
		const py = this.player.y - e.y;
		const pd = Math.hypot(px, py);
		if (pd < BARREL_RADIUS && this.lineOfSight(e.x, e.y, this.player.x, this.player.y)) {
			this.damagePlayer(Math.round(BARREL_DAMAGE * (1 - pd / BARREL_RADIUS)));
		}

		// Chain reactions: gather first, then damage, so the list stays stable.
		const caught: Entity[] = [];
		for (const other of this.entities) {
			if (other === e || other.removed || other.dead) continue;
			if (other.type !== "monster" && !(other.type === "prop" && PROPS[other.kind as PropKind]?.explodes)) {
				continue;
			}
			const d = Math.hypot(other.x - e.x, other.y - e.y);
			if (d < BARREL_RADIUS) caught.push(other);
		}
		for (const other of caught) {
			const d = Math.hypot(other.x - e.x, other.y - e.y);
			this.damageEntity(other, Math.round(BARREL_DAMAGE * (1 - d / BARREL_RADIUS)));
		}
	}

	/* ── Entities ───────────────────────────────────────────────────────── */

	private updateEntities(dt: number): void {
		for (const e of this.entities) {
			if (e.removed) continue;
			e.animTime += dt;

			switch (e.type) {
				case "monster":
					this.updateMonster(e, dt);
					break;
				case "projectile":
					this.updateProjectile(e, dt);
					break;
				case "effect":
					if (e.life !== undefined && e.animTime >= e.life) e.removed = true;
					break;
				default:
					break;
			}
		}
	}

	private updateProjectile(e: Entity, dt: number): void {
		const vx = e.vx ?? 0;
		const vy = e.vy ?? 0;
		const steps = 3;
		for (let i = 0; i < steps; i++) {
			const nx = e.x + (vx * dt) / steps;
			const ny = e.y + (vy * dt) / steps;

			if (this.map.isSolid(nx, ny)) {
				this.spawnEffect("fx.explosion", e.x, e.y, e.z, 5, 16);
				this.audio.playAt("explode", this.distanceToPlayer(e), 0.5);
				e.removed = true;
				return;
			}

			const p = this.player;
			if (!p.dead && (nx - p.x) ** 2 + (ny - p.y) ** 2 < 0.36 * 0.36) {
				this.damagePlayer(e.damage ?? 10);
				this.spawnEffect("fx.explosion", nx, ny, e.z, 5, 16);
				e.removed = true;
				return;
			}

			e.x = nx;
			e.y = ny;
		}
	}

	private updateMonster(e: Entity, dt: number): void {
		const ai = e.ai;
		if (!ai) return;
		if (e.dead) return;

		const p = this.player;
		const dx = p.x - e.x;
		const dy = p.y - e.y;
		const dist = Math.hypot(dx, dy);
		const canSee = !p.dead && this.lineOfSight(e.x, e.y, p.x, p.y);

		if (!ai.alerted) {
			// Idle monsters notice you at a distance, or the moment you're close.
			if (canSee && (dist < 12 || dist < 3)) this.wake(e);
			else return;
		}

		if (p.dead) {
			ai.state = "chase";
			e.anim = `${ai.def.sprite}.${ai.def.moveAnim}`;
			return;
		}

		ai.cooldown -= dt;
		ai.driftTimer -= dt;
		if (ai.driftTimer <= 0) {
			ai.driftTimer = randRange(0.6, 1.8);
			ai.drift = Math.random() < 0.5 ? -1 : 1;
		}

		switch (ai.state) {
			case "pain":
				ai.timer -= dt;
				if (ai.timer <= 0) {
					ai.state = "chase";
					e.anim = `${ai.def.sprite}.${ai.def.moveAnim}`;
					e.animLoop = true;
				}
				return;

			case "windup": {
				ai.timer -= dt;
				if (ai.timer <= 0) {
					this.monsterAttack(e, canSee);
					ai.state = "cooldown";
					ai.timer = 0.25;
					e.anim = `${ai.def.sprite}.${ai.def.moveAnim}`;
					e.animLoop = true;
				}
				return;
			}

			case "cooldown":
				ai.timer -= dt;
				if (ai.timer <= 0) ai.state = "chase";
				return;

			default:
				break;
		}

		// Chasing: attack when in range and visible, otherwise close the distance.
		const inRange = dist <= ai.def.attackRange;
		if (canSee && inRange && ai.cooldown <= 0) {
			ai.state = "windup";
			ai.timer = ai.def.windup;
			ai.cooldown = ai.def.attackCooldown;
			ai.burst = ai.def.kind === "brute" ? 3 : 1;
			e.anim = `${ai.def.sprite}.${ai.def.attackAnim}`;
			e.animTime = 0;
			e.animLoop = false;
			return;
		}

		e.anim = `${ai.def.sprite}.${ai.def.moveAnim}`;
		e.animLoop = true;
		e.animFps = ai.def.kind === "hound" ? 10 : 6;

		// Melee monsters crowd right up; shooters keep a little distance so they
		// don't shove their sprite into the player's face.
		const desired = ai.def.attack === "melee" ? 0.6 : 2.2;
		if (dist > desired) {
			const nx = dx / (dist || 1);
			const ny = dy / (dist || 1);
			// Drift perpendicular a little so a pack spreads out instead of stacking.
			const sx = -ny * ai.drift * 0.35;
			const sy = nx * ai.drift * 0.35;
			const speed = ai.def.speed * dt;
			const before = { x: e.x, y: e.y };
			this.moveWithCollision(e, (nx + sx) * speed, (ny + sy) * speed, e.radius, e);
			// Stuck on geometry: flip the drift so the next steps try the other way.
			if (Math.abs(e.x - before.x) + Math.abs(e.y - before.y) < speed * 0.2) {
				ai.drift = -ai.drift;
				ai.driftTimer = randRange(0.4, 0.9);
			}
			this.openDoorFor(e);
		}
	}

	/** Monsters let themselves through unlocked doors they walk into. */
	private openDoorFor(e: Entity): void {
		const ahead = 0.6;
		const dx = this.player.x - e.x;
		const dy = this.player.y - e.y;
		const len = Math.hypot(dx, dy) || 1;
		const cx = Math.floor(e.x + (dx / len) * ahead);
		const cy = Math.floor(e.y + (dy / len) * ahead);
		const door = this.map.doorAt(cx, cy);
		if (door && !door.key && door.state === "closed") {
			door.state = "opening";
			this.audio.playAt("doorOpen", this.distanceTo(cx + 0.5, cy + 0.5), 0.7);
		}
	}

	private monsterAttack(e: Entity, canSee: boolean): void {
		const ai = e.ai;
		if (!ai || !canSee) return;
		const p = this.player;
		const dist = this.distanceToPlayer(e);
		const def = ai.def;

		this.audio.playAt(def.attackSound, dist);

		if (def.attack === "melee") {
			if (dist <= def.attackRange) this.damagePlayer(randInt(def.damage[0], def.damage[1]));
			return;
		}

		if (def.attack === "projectile") {
			this.spawnFireball(e, p.x, p.y, randInt(def.damage[0], def.damage[1]));
			return;
		}

		// Hitscan: accuracy falls off with range, brutes fire a burst.
		const shots = def.kind === "brute" ? 3 : 1;
		for (let i = 0; i < shots; i++) {
			const spread = randRange(-0.06, 0.06) * Math.min(3, 1 + dist / 8);
			const angle = Math.atan2(p.y - e.y, p.x - e.x) + spread;
			const dx = Math.cos(angle);
			const dy = Math.sin(angle);
			const wallDist = this.castRay(e.x, e.y, dx, dy, def.attackRange);
			// Does the shot reach the player before it hits a wall?
			const toPlayer = Math.hypot(p.x - e.x, p.y - e.y);
			const perp = Math.abs((p.x - e.x) * dy - (p.y - e.y) * dx);
			if (toPlayer < wallDist && perp < 0.34) {
				this.damagePlayer(randInt(def.damage[0], def.damage[1]));
			} else if (wallDist < def.attackRange) {
				this.spawnEffect("fx.spark", e.x + dx * wallDist, e.y + dy * wallDist, 0.5, 3, 20);
			}
		}
	}

	/* ── Small helpers ──────────────────────────────────────────────────── */

	private distanceTo(x: number, y: number): number {
		return Math.hypot(this.player.x - x, this.player.y - y);
	}

	private distanceToPlayer(e: Entity): number {
		return this.distanceTo(e.x, e.y);
	}

	setMessage(text: string): void {
		this.message = text;
		this.messageTimer = 3;
	}

	/** Player state that survives to the next level. */
	carryState(): Partial<PlayerState> {
		const p = this.player;
		return {
			health: Math.max(20, p.health),
			armor: p.armor,
			bullets: p.bullets,
			shells: p.shells,
			weapon: p.weapon,
			owned: new Set(p.owned),
		};
	}
}
