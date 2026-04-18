"use client";

import { useEffect, useState } from "react";
import type { GuestbookEntryDTO } from "@/app/api/guestbook/route";

type State =
	| { status: "loading" }
	| { status: "error"; message: string }
	| { status: "ready"; entries: GuestbookEntryDTO[] };

export default function GuestbookInline() {
	const [state, setState] = useState<State>({ status: "loading" });

	useEffect(() => {
		let cancelled = false;
		fetch("/api/guestbook")
			.then(async (res) => {
				if (!res.ok) {
					const body = await res.json().catch(() => ({}));
					throw new Error(body?.error || `status ${res.status}`);
				}
				return (await res.json()) as GuestbookEntryDTO[];
			})
			.then((entries) => {
				if (!cancelled) setState({ status: "ready", entries });
			})
			.catch((err: Error) => {
				if (!cancelled)
					setState({ status: "error", message: err.message });
			});
		return () => {
			cancelled = true;
		};
	}, []);

	if (state.status === "loading") {
		return (
			<span style={{ color: "var(--term-dim)" }}>
				fetching guestbook…
			</span>
		);
	}
	if (state.status === "error") {
		return (
			<span style={{ color: "var(--term-red)" }}>
				could not load guestbook: {state.message}
			</span>
		);
	}
	const { entries } = state;
	return (
		<div className="my-2 text-[12.5px] max-w-[74ch]">
			<div
				className="text-[11px] tracking-[0.08em] uppercase mb-2"
				style={{ color: "var(--term-amber)" }}
			>
				guestbook · {entries.length} entr
				{entries.length === 1 ? "y" : "ies"}
			</div>
			{entries.length === 0 ? (
				<div style={{ color: "var(--term-dim)" }}>
					no entries yet — be the first at{" "}
					<a
						href="/guestbook"
						style={{ color: "var(--term-blue)" }}
					>
						/guestbook
					</a>
				</div>
			) : (
				<>
					{entries.slice(0, 10).map((e) => (
						<div key={e.id} className="py-1">
							<span style={{ color: "var(--term-green)" }}>
								@{e.githubLogin}
							</span>
							<span style={{ color: "var(--term-dim)" }}>
								{" "}
								· {new Date(e.createdAt).toLocaleDateString()}
							</span>
							<div
								className="pl-3"
								style={{ color: "var(--term-ink)" }}
							>
								{e.message}
							</div>
						</div>
					))}
					{entries.length > 10 && (
						<div style={{ color: "var(--term-dim)" }}>
							… and {entries.length - 10} more at{" "}
							<a
								href="/guestbook"
								style={{ color: "var(--term-blue)" }}
							>
								/guestbook
							</a>
						</div>
					)}
					<div
						className="mt-2"
						style={{ color: "var(--term-dim)" }}
					>
						→ sign:{" "}
						<a
							href="/guestbook"
							style={{ color: "var(--term-blue)" }}
						>
							/guestbook
						</a>
					</div>
				</>
			)}
		</div>
	);
}
