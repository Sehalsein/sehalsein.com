import type { Metadata } from "next";
import RacerPage from "@/src/view/racer/RacerPage";

export const metadata: Metadata = {
	title: "racer — sehal sein",
	description: "Isometric racing on procedurally generated circuits — pick a seed, pick a car, race the AI.",
};

export default function Page() {
	return <RacerPage />;
}
