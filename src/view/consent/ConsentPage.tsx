"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authClient, useSession } from "@/src/lib/authClient";

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
			// `oauth_query` is auto-injected by the oauthProviderClient() fetch
			// plugin from window.location.search — we don't pass it ourselves.
			const res = await authClient.oauth2.consent({ accept, scope });
			if (res.data?.redirect && res.data.url) {
				window.location.href = res.data.url;
				return;
			}
			if (res.error) {
				setError(
					res.error.message ||
						res.error.code ||
						`status ${res.error.status ?? "unknown"}`,
				);
				setSubmitting(false);
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
		<main className="min-h-screen w-full bg-term-bg text-term-ink font-mono px-6 py-16 md:px-12 md:py-20">
			<div className="mx-auto max-w-[560px]">
				<header className="mb-8">
					<div className="text-[11px] tracking-[0.12em] uppercase mb-3 text-term-faint">
						sehalsein.com / oauth consent
					</div>
					<h1 className="text-2xl md:text-3xl font-medium mb-2">
						Authorize access
					</h1>
					<p className="text-[13px] leading-[1.7] text-term-dim">
						<span className="text-term-blue">{clientName}</span> is
						requesting access to your sehalsein.com account.
					</p>
				</header>

				{isPending || !session ? (
					<div className="text-[12px] text-term-faint">loading…</div>
				) : (
					<div className="pl-4 border-l-2 border-term-blue">
						<div className="text-[11px] tracking-[0.1em] uppercase mb-2 text-term-amber">
							Requested scopes
						</div>
						<ul className="flex flex-col gap-1 mb-6">
							{scope.split(" ").map((s) => (
								<li key={s} className="text-[13px]">
									<span className="mr-2 text-term-muted">
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
								className="text-[13px] px-4 py-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-term-blue text-term-blue bg-transparent font-[inherit]"
							>
								{submitting === "accept"
									? "approving…"
									: "→ approve"}
							</button>
							<button
								type="button"
								disabled={!!submitting}
								onClick={() => decide(false)}
								className="text-[13px] px-4 py-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed border border-dashed border-term-muted text-term-dim bg-transparent font-[inherit]"
							>
								{submitting === "deny" ? "denying…" : "deny"}
							</button>
						</div>

						{error && (
							<div className="text-[11px] mt-3 text-term-red">
								{error}
							</div>
						)}

						<div className="mt-6 text-[11px] text-term-faint">
							signed in as{" "}
							<span className="text-term-blue">
								{(
									session.user as {
										githubLogin?: string | null;
									}
								).githubLogin ?? session.user.name}
							</span>
						</div>
					</div>
				)}

				<footer className="mt-14 pt-6 text-[11px] flex flex-wrap gap-x-5 gap-y-2 text-term-faint border-t border-dashed border-term-rule">
					<Link
						href="/terminal"
						className="underline underline-offset-4 text-term-blue"
					>
						→ terminal
					</Link>
				</footer>
			</div>
		</main>
	);
}
