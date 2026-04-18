"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { signIn, signOut, useSession } from "@/src/lib/authClient";
import type { GuestbookEntryDTO } from "@/app/api/guestbook/route";

const MAX = 200;

type Entry = GuestbookEntryDTO;

function relativeTime(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const sec = Math.floor(diff / 1000);
	if (sec < 60) return "just now";
	const min = Math.floor(sec / 60);
	if (min < 60) return `${min}m ago`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr}h ago`;
	const day = Math.floor(hr / 24);
	if (day < 30) return `${day}d ago`;
	return new Date(iso).toLocaleDateString();
}

export default function GuestbookPage() {
	const { data: session, isPending } = useSession();
	const [entries, setEntries] = useState<Entry[] | null>(null);
	const [message, setMessage] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		const res = await fetch("/api/guestbook");
		if (!res.ok) return;
		setEntries(await res.json());
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const sessionLogin =
		(session?.user as { githubLogin?: string | null } | undefined)
			?.githubLogin ?? null;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = message.trim();
		if (!trimmed) return;
		setSubmitting(true);
		setError(null);
		const res = await fetch("/api/guestbook", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message: trimmed }),
		});
		setSubmitting(false);
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			setError(body?.error || `failed (${res.status})`);
			return;
		}
		setMessage("");
		await load();
	};

	const handleDelete = async (id: string) => {
		const res = await fetch(`/api/guestbook?id=${id}`, { method: "DELETE" });
		if (res.ok) await load();
	};

	return (
		<main className="min-h-screen w-full bg-term-bg text-term-ink font-mono px-6 py-16 md:px-12 md:py-20">
			<div className="mx-auto max-w-[720px]">
				<header className="mb-8">
					<div className="text-[11px] tracking-[0.12em] uppercase mb-3 text-term-faint">
						sehalsein.com / guestbook
					</div>
					<h1 className="text-2xl md:text-3xl font-medium mb-2">
						Say hi 👋
					</h1>
					<p className="text-[13px] leading-[1.7] text-term-dim">
						Sign in with GitHub. One line. 200 chars max. Keep it
						friendly.
					</p>
				</header>

				<section className="pl-4 mb-10 border-l-2 border-term-blue">
					{isPending ? (
						<div className="text-[12px] text-term-faint">…</div>
					) : session ? (
						<form
							onSubmit={handleSubmit}
							className="flex flex-col gap-3"
						>
							<div className="text-[11px] text-term-dim">
								signed in as{" "}
								<span className="text-term-blue">
									{sessionLogin ?? session.user.name}
								</span>
								{" · "}
								<button
									type="button"
									onClick={() => signOut()}
									className="underline underline-offset-4 cursor-pointer text-term-faint"
								>
									sign out
								</button>
							</div>
							<div className="flex gap-2 items-start">
								<span className="pt-2 text-term-muted">▸</span>
								<textarea
									value={message}
									onChange={(e) =>
										setMessage(e.target.value.slice(0, MAX))
									}
									placeholder="leave a one-liner…"
									rows={2}
									className="flex-1 bg-transparent outline-none resize-none text-[14px] leading-[1.6] border border-dashed border-term-rule px-2.5 py-2 text-term-ink font-[inherit]"
								/>
							</div>
							<div className="flex justify-between items-center">
								<div className="text-[11px] text-term-faint">
									{message.length}/{MAX}
								</div>
								<button
									type="submit"
									disabled={submitting || !message.trim()}
									className="text-[12px] px-3 py-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 border border-term-blue text-term-blue bg-transparent font-[inherit]"
								>
									{submitting ? "signing…" : "sign →"}
								</button>
							</div>
							{error && (
								<div className="text-[11px] text-term-red">
									{error}
								</div>
							)}
						</form>
					) : (
						<button
							type="button"
							onClick={() =>
								signIn.social({
									provider: "github",
									callbackURL: "/guestbook",
								})
							}
							className="text-[13px] px-4 py-2 cursor-pointer border border-term-blue text-term-blue bg-transparent font-[inherit]"
						>
							→ sign in with GitHub
						</button>
					)}
				</section>

				<section className="flex flex-col gap-4">
					<h2 className="text-[11px] tracking-[0.1em] uppercase font-medium text-term-amber">
						Entries
					</h2>
					{entries === null ? (
						<div className="text-[12px] text-term-faint">
							loading…
						</div>
					) : entries.length === 0 ? (
						<div className="text-[12px] text-term-faint">
							no entries yet — be the first.
						</div>
					) : (
						entries.map((entry) => {
							const canDelete =
								session && sessionLogin === entry.githubLogin;
							return (
								<article
									key={entry.id}
									className="flex gap-3 items-start pb-4 border-b border-dashed border-term-rule"
								>
									{entry.avatarUrl ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={entry.avatarUrl}
											alt={entry.githubLogin}
											width={32}
											height={32}
											className="rounded-full shrink-0"
										/>
									) : (
										<div className="w-8 h-8 rounded-full shrink-0 bg-term-rule" />
									)}
									<div className="flex-1 min-w-0">
										<div className="flex gap-2 items-baseline flex-wrap">
											<a
												href={`https://github.com/${entry.githubLogin}`}
												target="_blank"
												rel="noopener noreferrer"
												className="text-[12.5px] font-medium text-term-blue"
											>
												{entry.githubLogin}
											</a>
											<span className="text-[10px] text-term-faint">
												· {relativeTime(entry.createdAt)}
											</span>
											{canDelete && (
												<button
													type="button"
													onClick={() =>
														handleDelete(entry.id)
													}
													className="ml-auto text-[10px] underline underline-offset-4 cursor-pointer text-term-faint"
												>
													delete
												</button>
											)}
										</div>
										<p className="text-[14px] leading-[1.6] mt-1 break-words">
											{entry.message}
										</p>
									</div>
								</article>
							);
						})
					)}
				</section>

				<footer className="mt-14 pt-6 text-[11px] flex flex-wrap gap-x-5 gap-y-2 text-term-faint border-t border-dashed border-term-rule">
					<Link
						href="/terminal"
						className="underline underline-offset-4 text-term-blue"
					>
						→ terminal
					</Link>
					<Link
						href="/now"
						className="underline underline-offset-4 text-term-blue"
					>
						→ now
					</Link>
				</footer>
			</div>
		</main>
	);
}
