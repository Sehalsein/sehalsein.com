import type { Metadata } from "next";
import PlaygroundPage from "@/src/view/playground/PlaygroundPage";

export const metadata: Metadata = {
	title: "playground — sehal sein",
	description: "Isometric racing on procedurally generated circuits — pick a seed, pick a car, race the AI.",
};

export default function Page() {
	return <PlaygroundPage />;
}
