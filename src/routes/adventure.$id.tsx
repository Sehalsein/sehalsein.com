import { createFileRoute } from "@tanstack/react-router";
import AdventurePage from "@/src/view/adventure/AdventurePage";

export const Route = createFileRoute("/adventure/$id")({
	ssr: false,
	component: AdventureRoute,
});

function AdventureRoute() {
	const { id } = Route.useParams();
	return <AdventurePage id={id} />;
}
