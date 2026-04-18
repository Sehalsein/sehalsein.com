"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient, useSession } from "@/src/lib/authClient";

type OAuth2Client = {
	oauth2: {
		consent: (args: {
			accept: boolean;
			scope?: string;
			oauth_query?: string;
		}) => Promise<{ data?: { redirect_uri?: string } | null }>;
	};
};

export default function ConsentPage() {
	const router = useRouter();
	const params = useSearchParams();
	const { data: session, isPending } = useSession();
	const [submitting, setSubmitting] = useState<false | "accept" | "deny">(
		false,
	);
	const [error, setError] = useState<string | null>(null);

	const clientName = params.get("client_name") ?? "an MCP client";
	const scope = params.get("scope") ?? "openid profile email";

	useEffect(() => {
		if (!isPending && !session) {
			router.replace("/guestbook?callbackURL=/consent");
		}
	}, [isPending, session, router]);

	const decide = async (accept: boolean) => {
		setSubmitting(accept ? "accept" : "deny");
		setError(null);
		try {
			const client = authClient as unknown as OAuth2Client;
			const oauth_query = window.location.search.replace(/^\?/, "");
			const res = await client.oauth2.consent({
				accept,
				scope,
				oauth_query,
			});
			const redirect = res?.data?.redirect_uri;
			if (redirect) {
				window.location.href = redirect;
				return;
			}
			setError("no redirect URL returned by the server.");
			setSubmitting(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "consent failed.");
			setSubmitting(false);
		}
	};

	return (
		<main
			className="min-h-screen w-full px-6 py-16 md:px-12 md:py-20"
			style={{
				background: "#0b0d10",
				color: "#d7d9de",
				fontFamily: "var(--font-mono, ui-monospace, monospace)",
			}}
		>
			<div className="mx-auto max-w-[560px]">
				<header className="mb-8">
					<div
						className="text-[11px] tracking-[0.12em] uppercase mb-3"
						style={{ color: "#7a7f86" }}
					>
						sehalsein.com / oauth consent
					</div>
					<h1 className="text-2xl md:text-3xl font-medium mb-2">
						Authorize access
					</h1>
					<p
						className="text-[13px] leading-[1.7]"
						style={{ color: "#9aa0a8" }}
					>
						<span style={{ color: "#7ab7ff" }}>{clientName}</span>{" "}
						is requesting access to your sehalsein.com account.
					</p>
				</header>

				{isPending || !session ? (
					<div
						className="text-[12px]"
						style={{ color: "#6a7078" }}
					>
						loading…
					</div>
				) : (
					<div
						className="pl-4"
						style={{ borderLeft: "2px solid #2b7fff" }}
					>
						<div
							className="text-[11px] tracking-[0.1em] uppercase mb-2"
							style={{ color: "#f5b041" }}
						>
							Requested scopes
						</div>
						<ul className="flex flex-col gap-1 mb-6">
							{scope.split(" ").map((s) => (
								<li
									key={s}
									className="text-[13px]"
									style={{ color: "#d7d9de" }}
								>
									<span
										className="mr-2"
										style={{ color: "#5a6068" }}
									>
										▸
									</span>
									{s}
								</li>
							))}
						</ul>

						<div className="flex gap-3">
							<button
								type="button"
								disabled={!!submitting}
								onClick={() => decide(true)}
								className="text-[13px] px-4 py-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
								style={{
									border: "1px solid #2b7fff",
									color: "#7ab7ff",
									background: "transparent",
									fontFamily: "inherit",
								}}
							>
								{submitting === "accept"
									? "approving…"
									: "→ approve"}
							</button>
							<button
								type="button"
								disabled={!!submitting}
								onClick={() => decide(false)}
								className="text-[13px] px-4 py-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
								style={{
									border: "1px dashed #5a6068",
									color: "#9aa0a8",
									background: "transparent",
									fontFamily: "inherit",
								}}
							>
								{submitting === "deny" ? "denying…" : "deny"}
							</button>
						</div>

						{error && (
							<div
								className="text-[11px] mt-3"
								style={{ color: "#d1618a" }}
							>
								{error}
							</div>
						)}

						<div
							className="mt-6 text-[11px]"
							style={{ color: "#6a7078" }}
						>
							signed in as{" "}
							<span style={{ color: "#7ab7ff" }}>
								{(
									session.user as {
										githubLogin?: string | null;
									}
								).githubLogin ?? session.user.name}
							</span>
						</div>
					</div>
				)}

				<footer
					className="mt-14 pt-6 text-[11px] flex flex-wrap gap-x-5 gap-y-2"
					style={{
						color: "#6a7078",
						borderTop: "1px dashed #2a2f36",
					}}
				>
					<Link
						href="/terminal"
						className="underline underline-offset-4"
						style={{ color: "#7ab7ff" }}
					>
						→ back to terminal
					</Link>
				</footer>
			</div>
		</main>
	);
}
