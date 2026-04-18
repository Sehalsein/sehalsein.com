import Link from "next/link";
import {
	NOW_LAST_UPDATED,
	NOW_SECTIONS,
	NOW_INSPIRATION_URL,
} from "@/src/data/now";
import ContributionHeatmap from "@/src/view/widgets/ContributionHeatmap";

export default function NowPage() {
	return (
		<main className="min-h-screen w-full bg-term-bg text-term-ink font-mono px-6 py-16 md:px-12 md:py-20">
			<div className="mx-auto max-w-[720px]">
				<header className="mb-10">
					<div className="text-[11px] tracking-[0.12em] uppercase mb-3 text-term-faint">
						sehalsein.com / now
					</div>
					<h1 className="text-2xl md:text-3xl font-medium mb-2">
						What I&apos;m up to right now
					</h1>
					<p className="text-[13px] leading-[1.7] text-term-dim">
						A{" "}
						<a
							href={NOW_INSPIRATION_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="underline underline-offset-4 text-term-blue"
						>
							/now page
						</a>{" "}
						— like an &quot;about&quot; but for what&apos;s in my head
						this month. Updated when it stops being true.
					</p>
				</header>

				<div className="flex flex-col gap-8">
					{NOW_SECTIONS.map((section) => (
						<section
							key={section.id}
							className="pl-4 border-l-2 border-term-blue"
						>
							<h2 className="text-[11px] tracking-[0.1em] uppercase mb-3 font-medium text-term-amber">
								{section.title}
							</h2>
							<ul className="flex flex-col gap-2">
								{section.items.map((item, i) => (
									<li
										key={i}
										className="text-[14px] leading-[1.7]"
									>
										<span className="mr-2 text-term-muted">
											▸
										</span>
										{item}
									</li>
								))}
							</ul>
						</section>
					))}
				</div>

				<section className="mt-12 pl-4 border-l-2 border-term-blue">
					<ContributionHeatmap />
				</section>

				<footer className="mt-14 pt-6 text-[11px] flex flex-wrap gap-x-5 gap-y-2 text-term-faint border-t border-dashed border-term-rule">
					<span>
						Last updated:{" "}
						<span className="text-term-dim">
							{NOW_LAST_UPDATED}
						</span>
					</span>
					<Link
						href="/terminal"
						className="underline underline-offset-4 text-term-blue"
					>
						→ terminal
					</Link>
					<Link
						href="/resume"
						className="underline underline-offset-4 text-term-blue"
					>
						→ resume
					</Link>
					<Link
						href="/os"
						className="underline underline-offset-4 text-term-blue"
					>
						→ os
					</Link>
				</footer>
			</div>
		</main>
	);
}
