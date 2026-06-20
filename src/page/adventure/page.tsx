import { Pirata_One, Spectral } from "next/font/google";
import type { Metadata } from "next";
import AdventurePage from "@/src/view/adventure/AdventurePage";
import TitleScreen from "@/src/view/adventure/TitleScreen";

// Blackletter display face for the Hollowreach title plate, headings, and
// the d20 numerals — the "engraved tabletop rulebook" voice.
const pirata = Pirata_One({
	subsets: ["latin"],
	weight: ["400"],
	variable: "--font-pirata",
});

// Literary serif for narration and body copy — gives the prose a "book" feel.
const spectral = Spectral({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	style: ["normal", "italic"],
	variable: "--font-serif",
});

export const metadata: Metadata = {
	title: "Hollowreach · Sehal Sein",
	description:
		"Hollowreach — an LLM-narrated solo tabletop RPG. Roll a hero, brave the dark, and live with what the dice and the Game Master decide.",
};

/**
 * The fonts wrapper, shared by both routes:
 *   /adventure       → the title screen + your saved tales
 *   /adventure/[id]  → one specific adventure (resumes if a save exists)
 */
export default function AdventureShell({ id }: { id?: string }) {
	return (
		<div className={`${pirata.variable} ${spectral.variable}`}>
			{id ? <AdventurePage id={id} /> : <TitleScreen />}
		</div>
	);
}
