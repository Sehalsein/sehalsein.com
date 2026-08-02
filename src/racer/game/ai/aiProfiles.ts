import profilesData from "../../data/ai/profiles.json";
import type { Rng } from "../../shared/rng";

/** All 0..1 — semantics documented in data/ai/profiles.json. */
export interface AIProfile {
	id: string;
	name: string;
	aggression: number;
	consistency: number;
	cornering: number;
	/** Seconds of input lag. */
	reactionTime: number;
	braking: number;
	mistakeChance: number;
	difficulty: number;
}

export function allProfiles(): AIProfile[] {
	return profilesData.profiles;
}

/** Field of drivers around a requested difficulty, with variety. */
export function pickFieldProfiles(rng: Rng, count: number): { profile: AIProfile; name: string }[] {
	const profiles = allProfiles();
	const names = [...profilesData.driverNames];
	const field: { profile: AIProfile; name: string }[] = [];
	for (let i = 0; i < count; i++) {
		const profile = profiles[rng.int(0, profiles.length - 1)];
		const nameIndex = names.length > 0 ? rng.int(0, names.length - 1) : 0;
		const name = names.length > 0 ? names.splice(nameIndex, 1)[0] : `Driver ${i + 1}`;
		field.push({ profile, name });
	}
	return field;
}
