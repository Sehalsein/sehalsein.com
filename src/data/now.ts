export const NOW_LAST_UPDATED = "2026-04-17";

export type NowSection = {
	id: string;
	title: string;
	items: string[];
};

export const NOW_SECTIONS: NowSection[] = [
	{
		id: "working-on",
		title: "Working on",
		items: [
			"Platform engineering at Planned.",
			"Scaling DGymBook past 50k users — the next chunk is billing + coach tools.",
			"This site: adding a guestbook, an MCP server, and a terminal that tries too hard.",
		],
	},
	{
		id: "reading",
		title: "Reading",
		items: [
			"Designing Data-Intensive Applications — the one book I keep re-opening.",
			"Anthropic's engineering blog posts on long-horizon agents.",
			"Old Rich Hickey talks. Still underrated.",
		],
	},
	{
		id: "listening",
		title: "Listening",
		items: [
			"Lo-fi + ambient while coding. Boring, I know.",
			"Huberman Lab when commuting.",
			"Soft Skills Engineering for the dev-humor fix.",
		],
	},
	{
		id: "learning",
		title: "Learning",
		items: [
			"Going deeper on Postgres internals — MVCC, indexing strategies, the usual.",
			"MCP clients and how remote tool servers hold up in practice.",
			"Trying to get fluent-enough with Rust to ship something small.",
		],
	},
	{
		id: "life",
		title: "Life",
		items: [
			"Montreal winter is finally loosening its grip.",
			"Trying to cook more than three recipes on repeat.",
			"Touching grass when the internet gets loud.",
		],
	},
];

export const NOW_INSPIRATION_URL = "https://nownownow.com/about";
