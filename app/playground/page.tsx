import type { Metadata } from "next";
import PlaygroundPage from "@/src/page/playground/page";

export const metadata: Metadata = {
	title: "playground — sehal sein",
	description:
		"A low-poly 3D floating island. Orbit around, click objects to explore the site.",
};

export default function Page() {
	return <PlaygroundPage />;
}
