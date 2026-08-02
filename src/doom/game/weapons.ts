import type { SoundName } from "../engine/Audio";

/**
 * The four weapons. Each is a small state machine driven by `WeaponState` in
 * `World`: idle → fire (damage lands on the frame the shot leaves) → refire
 * delay → idle, with the shotgun adding a pump.
 *
 * Frame indices point into the `view.*` sprite strips built in `art/sprites`.
 */

export type WeaponId = "fist" | "pistol" | "shotgun" | "chaingun";

export type AmmoType = "bullets" | "shells" | null;

export interface WeaponDef {
	readonly id: WeaponId;
	readonly name: string;
	readonly sprite: string;
	readonly ammo: AmmoType;
	/** Ammo spent per pull of the trigger. */
	readonly ammoPerShot: number;
	/** Pellets per shot; the shotgun sprays, everything else fires one. */
	readonly pellets: number;
	readonly damage: readonly [number, number];
	/** Radians of random spread applied per pellet. */
	readonly spread: number;
	/** Seconds from trigger to the shot leaving the barrel. */
	readonly fireDelay: number;
	/** Seconds after the shot before the weapon can fire again. */
	readonly refire: number;
	readonly auto: boolean;
	readonly sound: SoundName;
	readonly range: number;
	/** Frame shown while winding up / firing / recovering. */
	readonly frames: { readonly idle: number; readonly fire: number; readonly recover: number };
	/** Extra recovery frame, for the shotgun pump. */
	readonly pumpFrames?: readonly number[];
	/** How hard the shot kicks the view, in pixels. */
	readonly kick: number;
	/** Cells the muzzle flash lights the room by. */
	readonly flash: number;
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
	fist: {
		id: "fist",
		name: "fist",
		sprite: "view.fist",
		ammo: null,
		ammoPerShot: 0,
		pellets: 1,
		damage: [4, 14],
		spread: 0,
		fireDelay: 0.1,
		refire: 0.32,
		auto: true,
		sound: "punch",
		range: 1.4,
		frames: { idle: 0, fire: 1, recover: 1 },
		kick: 2,
		flash: 0,
	},
	pistol: {
		id: "pistol",
		name: "pistol",
		sprite: "view.pistol",
		ammo: "bullets",
		ammoPerShot: 1,
		pellets: 1,
		damage: [7, 14],
		spread: 0.016,
		fireDelay: 0.05,
		refire: 0.28,
		auto: false,
		sound: "pistol",
		range: 32,
		frames: { idle: 0, fire: 1, recover: 2 },
		kick: 4,
		flash: 6,
	},
	shotgun: {
		id: "shotgun",
		name: "shotgun",
		sprite: "view.shotgun",
		ammo: "shells",
		ammoPerShot: 1,
		pellets: 7,
		damage: [5, 12],
		spread: 0.085,
		fireDelay: 0.06,
		refire: 0.85,
		auto: false,
		sound: "shotgun",
		range: 24,
		frames: { idle: 0, fire: 1, recover: 2 },
		pumpFrames: [2, 3],
		kick: 9,
		flash: 9,
	},
	chaingun: {
		id: "chaingun",
		name: "chaingun",
		sprite: "view.chaingun",
		ammo: "bullets",
		ammoPerShot: 1,
		pellets: 1,
		damage: [6, 12],
		spread: 0.045,
		fireDelay: 0.03,
		refire: 0.1,
		auto: true,
		sound: "chaingun",
		range: 32,
		// Alternates the two barrel-lit frames while held down.
		frames: { idle: 0, fire: 1, recover: 2 },
		kick: 3,
		flash: 7,
	},
};

/** Selection order for `[`/`]` and the number keys. */
export const WEAPON_ORDER: readonly WeaponId[] = [
	"fist",
	"pistol",
	"shotgun",
	"chaingun",
];

export const MAX_AMMO = { bullets: 200, shells: 50 } as const;
