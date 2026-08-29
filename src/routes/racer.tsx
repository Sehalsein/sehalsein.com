import { createFileRoute, Outlet } from "@tanstack/react-router";
import RacerPage from "@/src/view/racer/RacerPage";

export const Route = createFileRoute("/racer")({
	ssr: false,
	head: () => ({
		meta: [
			{ title: "Racer — Sehal Sein" },
			{
				name: "description",
				content: "Isometric racing on procedurally generated circuits.",
			},
		],
	}),
	component: RacerRoute,
});

function RacerRoute() {
	return (
		<>
			<RacerPage />
			<Outlet />
		</>
	);
}
