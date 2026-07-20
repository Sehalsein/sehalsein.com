import type { Metadata } from "next";
import PlaygroundPage from "@/src/view/playground/PlaygroundPage";

interface RunPageProps {
	params: Promise<{ run: string }>;
}

export async function generateMetadata({ params }: RunPageProps): Promise<Metadata> {
	const { run } = await params;
	const seed = decodeURIComponent(run).toUpperCase().slice(0, 24);
	return {
		title: `${seed} — playground — sehal sein`,
		description: `Race the procedurally generated circuit "${seed}" — same link, same track, every time.`,
	};
}

export default function Page() {
	// the client engine reads the seed + settings from the URL and auto-starts
	return <PlaygroundPage />;
}
