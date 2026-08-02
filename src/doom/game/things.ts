import type { SoundName } from "../engine/Audio";
import type { KeyColor } from "./map";

/**
 * Static definitions for everything the map can spawn. Behaviour lives in
 * `World`; this file is only the data — how big a thing is, how much it hurts,
 * which sprite strips it animates through.
 *
 * `height` is the sprite's world height in cells, where a wall is exactly 1.
 * Sprites are anchored at the floor, so a 0.72-high grunt reads as roughly
 * shoulder-height to a player whose eye sits at 0.55.
 */

export type MonsterKind = "grunt" | "hound" | "imp" | "brute";

export interface MonsterDef {
	readonly kind: MonsterKind;
	readonly health: number;
	/** Cells per second when charging the player. */
	readonly speed: number;
	/** Collision radius in cells. */
	readonly radius: number;
	readonly height: number;
	/** Sprite key prefix — `${sprite}.walk` etc. */
	readonly sprite: string;
	/** Strip played while moving; monsters idle on frame 0 of it. */
	readonly moveAnim: string;
	/** Strip played while winding up an attack. */
	readonly attackAnim: string;
	readonly deathAnim: string;
	readonly painAnim: string;
	/** "hitscan" fires instantly, "melee" needs contact, "projectile" throws. */
	readonly attack: "hitscan" | "melee" | "projectile";
	readonly damage: readonly [number, number];
	/** Seconds between attacks. */
	readonly attackCooldown: number;
	/** Seconds of wind-up before the attack actually lands. */
	readonly windup: number;
	/** Cells — past this the monster closes distance instead of attacking. */
	readonly attackRange: number;
	/** 0..1 chance a hit staggers the monster out of its current action. */
	readonly painChance: number;
	readonly alertSound: SoundName;
	readonly attackSound: SoundName;
	readonly scoreValue: number;
}

export const MONSTERS: Record<MonsterKind, MonsterDef> = {
	grunt: {
		kind: "grunt",
		health: 20,
		speed: 1.5,
		radius: 0.3,
		height: 0.72,
		sprite: "grunt",
		moveAnim: "walk",
		attackAnim: "fire",
		deathAnim: "die",
		painAnim: "pain",
		attack: "hitscan",
		damage: [3, 9],
		attackCooldown: 1.1,
		windup: 0.35,
		attackRange: 14,
		painChance: 0.7,
		alertSound: "gruntAlert",
		attackSound: "gruntShoot",
		scoreValue: 100,
	},
	hound: {
		kind: "hound",
		health: 28,
		// Fast and melee-only: hounds are the pressure that stops you camping.
		speed: 3.4,
		radius: 0.32,
		height: 0.5,
		sprite: "hound",
		moveAnim: "walk",
		attackAnim: "bite",
		deathAnim: "die",
		painAnim: "pain",
		attack: "melee",
		damage: [4, 10],
		attackCooldown: 0.8,
		windup: 0.22,
		attackRange: 1.1,
		painChance: 0.55,
		alertSound: "houndAlert",
		attackSound: "punch",
		scoreValue: 150,
	},
	imp: {
		kind: "imp",
		health: 45,
		speed: 1.3,
		radius: 0.34,
		height: 0.85,
		sprite: "imp",
		moveAnim: "float",
		attackAnim: "throw",
		deathAnim: "die",
		painAnim: "pain",
		attack: "projectile",
		damage: [8, 16],
		attackCooldown: 1.7,
		windup: 0.45,
		attackRange: 16,
		painChance: 0.5,
		alertSound: "impAlert",
		attackSound: "fireball",
		scoreValue: 250,
	},
	brute: {
		kind: "brute",
		health: 90,
		speed: 1.7,
		radius: 0.42,
		height: 0.95,
		sprite: "brute",
		moveAnim: "walk",
		attackAnim: "fire",
		deathAnim: "die",
		painAnim: "pain",
		attack: "hitscan",
		damage: [5, 13],
		// Fires a three-round burst, so the cooldown covers the whole volley.
		attackCooldown: 1.5,
		windup: 0.4,
		attackRange: 16,
		painChance: 0.28,
		alertSound: "gruntAlert",
		attackSound: "gruntShoot",
		scoreValue: 400,
	},
};

export type ItemKind =
	| "medkit"
	| "stimpack"
	| "armor"
	| "clip"
	| "shells"
	| "shotgun"
	| "chaingun"
	| "keyRed"
	| "keyBlue"
	| "keyYellow";

export interface ItemDef {
	readonly sprite: string;
	readonly height: number;
	readonly sound: SoundName;
	/** HUD line shown when picked up. */
	readonly message: string;
	readonly health?: number;
	readonly armor?: number;
	readonly bullets?: number;
	readonly shells?: number;
	readonly weapon?: "shotgun" | "chaingun";
	readonly key?: KeyColor;
}

export const ITEMS: Record<ItemKind, ItemDef> = {
	medkit: {
		sprite: "item.medkit",
		height: 0.3,
		sound: "pickupHealth",
		message: "picked up a medkit",
		health: 25,
	},
	stimpack: {
		sprite: "item.stimpack",
		height: 0.24,
		sound: "pickupHealth",
		message: "picked up a stimpack",
		health: 10,
	},
	armor: {
		sprite: "item.armor",
		height: 0.34,
		sound: "pickup",
		message: "picked up combat armor",
		armor: 50,
	},
	clip: {
		sprite: "item.clip",
		height: 0.18,
		sound: "pickup",
		message: "picked up a clip",
		bullets: 12,
	},
	shells: {
		sprite: "item.shells",
		height: 0.2,
		sound: "pickup",
		message: "picked up shotgun shells",
		shells: 8,
	},
	shotgun: {
		sprite: "item.shotgun",
		height: 0.22,
		sound: "pickupWeapon",
		message: "you got the shotgun",
		weapon: "shotgun",
		shells: 8,
	},
	chaingun: {
		sprite: "item.chaingun",
		height: 0.26,
		sound: "pickupWeapon",
		message: "you got the chaingun",
		weapon: "chaingun",
		bullets: 20,
	},
	keyRed: {
		sprite: "item.keyRed",
		height: 0.28,
		sound: "pickupKey",
		message: "picked up the red keycard",
		key: "red",
	},
	keyBlue: {
		sprite: "item.keyBlue",
		height: 0.28,
		sound: "pickupKey",
		message: "picked up the blue keycard",
		key: "blue",
	},
	keyYellow: {
		sprite: "item.keyYellow",
		height: 0.28,
		sound: "pickupKey",
		message: "picked up the yellow keycard",
		key: "yellow",
	},
};

export type PropKind = "barrel" | "column" | "lamp" | "gore";

export interface PropDef {
	readonly sprite: string;
	readonly height: number;
	readonly radius: number;
	/** Props with no radius are decals you can walk over. */
	readonly solid: boolean;
	/** Barrels take damage and take the room with them. */
	readonly health?: number;
	readonly explodes?: boolean;
}

export const PROPS: Record<PropKind, PropDef> = {
	barrel: {
		sprite: "prop.barrel",
		height: 0.55,
		radius: 0.32,
		solid: true,
		health: 20,
		explodes: true,
	},
	column: { sprite: "prop.column", height: 0.9, radius: 0.34, solid: true },
	lamp: { sprite: "prop.lamp", height: 0.7, radius: 0.22, solid: true },
	gore: { sprite: "prop.gore", height: 0.16, radius: 0, solid: false },
};

export const BARREL_DAMAGE = 60;
export const BARREL_RADIUS = 2.6;

export function isMonsterKind(kind: string): kind is MonsterKind {
	return kind in MONSTERS;
}

export function isItemKind(kind: string): kind is ItemKind {
	return kind in ITEMS;
}

export function isPropKind(kind: string): kind is PropKind {
	return kind in PROPS;
}
