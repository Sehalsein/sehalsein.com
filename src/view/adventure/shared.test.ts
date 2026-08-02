/* Regression tests for the Hollowreach GM parser.
 * Run with: pnpm test  (node strips the types natively — no test framework). */

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseGM } from "./shared.ts";

const TURN = {
	narration: "The passage narrows. Something breathes in the dark ahead.",
	location: "The Hollow Barrow",
	choices: ["Press on", "Retreat"],
	check: null,
	hpDelta: 0,
	addItems: [],
	removeItems: [],
	enemy: null,
	xpDelta: 0,
	status: "playing",
};

test("parses a bare JSON turn", () => {
	assert.deepEqual(parseGM(JSON.stringify(TURN)), TURN);
});

test("parses a turn wrapped in a code fence", () => {
	const raw = "```json\n" + JSON.stringify(TURN) + "\n```";
	assert.deepEqual(parseGM(raw), TURN);
});

test("ignores reasoning whose braces would break a first-brace slice", () => {
	// This is the shape observed live on turns 10 and 11: the model reasons
	// about the schema (writing braces as it goes) and only then answers.
	const raw =
		'removeItems: maybe add spider parts? Not required. The check should be {"skill","ability","dc"} with dc around 12.\n' +
		"Now produce JSON. Thus final JSON:\n" +
		JSON.stringify(TURN);
	assert.deepEqual(parseGM(raw), TURN);
});

test("prefers the last turn when reasoning contains a decoy object", () => {
	const raw =
		'I could answer {"narration": "a draft I discarded", "choices": []} but that is weak.\n' +
		JSON.stringify(TURN);
	assert.deepEqual(parseGM(raw), TURN);
});

test("keeps braces that live inside string values", () => {
	const turn = {
		...TURN,
		narration: 'Carved above the door: "{ the way out is down }".',
	};
	assert.deepEqual(parseGM(JSON.stringify(turn)), turn);
});

test("keeps nested check and enemy objects intact", () => {
	const turn = {
		...TURN,
		check: { skill: "Perception", ability: "WIS", dc: 12 },
		enemy: { name: "Barrow Spider", hp: 9, maxHp: 14 },
		choices: [],
	};
	const parsed = parseGM("Reasoning first {oops}\n" + JSON.stringify(turn));
	assert.deepEqual(parsed, turn);
	assert.equal(parsed?.check?.dc, 12);
	assert.equal(parsed?.enemy?.hp, 9);
});

test("survives an unpaired quote in the reasoning prose", () => {
	const raw =
		'The player said "wait — and the DC ought to be 14 {maybe}.\n' +
		JSON.stringify(TURN);
	assert.deepEqual(parseGM(raw), TURN);
});

test("returns null for reasoning with no turn in it, so the caller can retry", () => {
	const raw =
		'Hmm, removeItems: maybe add spider parts? The schema wants {"skill","ability","dc"}. Now produce JSON. Thus final JSON:';
	assert.equal(parseGM(raw), null);
});

test("returns null for empty, blank and non-JSON input", () => {
	assert.equal(parseGM(""), null);
	assert.equal(parseGM("   \n  "), null);
	assert.equal(parseGM("The path is silent."), null);
	assert.equal(parseGM("[1,2,3]"), null);
});
