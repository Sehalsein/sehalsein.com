import type { Metadata } from "next";
import PlaygroundPage from "@/src/view/playground/PlaygroundPage";

export const metadata: Metadata = {
	title: "playground — sehal sein",
	description: "Drive a low-poly car around a track on an infinite grid.",
};

export default function Page() {
	return <PlaygroundPage />;
}
