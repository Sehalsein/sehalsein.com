import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import TitleScreen from "@/src/view/adventure/TitleScreen";

export const Route = createFileRoute("/adventure")({
	ssr: false,
	head: () => ({
		meta: [
			{ title: "Hollowreach — Sehal Sein" },
			{
				name: "description",
				content: "An LLM-narrated solo tabletop RPG.",
			},
		],
	}),
	component: AdventureIndex,
});

function AdventureIndex() {
	const matches = useMatches();
	const isChild = matches.some((match) => match.routeId === "/adventure/$id");
	return isChild ? <Outlet /> : <TitleScreen />;
}
