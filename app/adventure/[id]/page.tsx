import AdventureShell, { metadata } from "@/src/page/adventure/page";

export { metadata };

export default async function Page({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <AdventureShell id={id} />;
}
