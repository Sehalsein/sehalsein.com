import { createFileRoute } from "@tanstack/react-router";
import { createClientOnlyFn } from "@tanstack/react-start";
import { lazy, Suspense } from "react";

const loadEditorPage = createClientOnlyFn(
	() => import("@/src/view/editor/EditorPage"),
);
const EditorPage = lazy(loadEditorPage);

export const Route = createFileRoute("/editor")({
	ssr: false,
	head: () => ({
		meta: [
			{ title: "Draftroom — Sehal Sein" },
			{
				name: "description",
				content:
					"A local-first, block-based writing room built with TipTap.",
			},
		],
	}),
	component: () => (
		<Suspense fallback={<div className="draft-loading" aria-hidden="true" />}>
			<EditorPage />
		</Suspense>
	),
});
