"use client";

import Link from "next/link";
import Image from "next/image";
import { Download, Github, Linkedin, Mail, Smartphone } from "lucide-react";
import { RESUME_DATA } from "@/src/data/resume";

function formatDuration(from: number, to?: number): string {
	return to ? `${from}–${to}` : `${from}–present`;
}

export default function ResumePage() {
	return (
		<main className="min-h-screen w-full bg-term-bg text-term-ink font-mono px-6 py-16 md:px-12 md:py-20 print:bg-white print:text-black">
			<div className="mx-auto max-w-[720px]">
				{/* Header */}
				<header className="mb-10 flex items-start gap-5">
					<Image
						src={RESUME_DATA.photo}
						alt={RESUME_DATA.name}
						width={72}
						height={72}
						className="rounded-full w-[72px] h-[72px] object-cover shrink-0 border border-term-rule"
						priority
					/>
					<div className="flex-1 min-w-0">
						<div className="text-[11px] tracking-[0.12em] uppercase mb-2 text-term-faint">
							sehalsein.com / resume
						</div>
						<h1 className="text-2xl md:text-3xl font-medium mb-1">
							{RESUME_DATA.name}
						</h1>
						<div className="text-[12px] text-term-dim">
							{RESUME_DATA.location}
						</div>
					</div>

					<button
						type="button"
						onClick={() => window.print()}
						className="shrink-0 p-2 cursor-pointer print:hidden transition-opacity hover:opacity-70 border border-term-rule text-term-dim"
						aria-label="Print or save as PDF"
						title="Print / save as PDF"
					>
						<Download size={14} />
					</button>
				</header>

				{/* Summary */}
				<section className="pl-4 mb-10 border-l-2 border-term-blue">
					<p className="text-[14px] leading-[1.7] max-w-[60ch]">
						{RESUME_DATA.summary}
					</p>
				</section>

				{/* Contact */}
				<section className="mb-10">
					<SectionHeader>Contact</SectionHeader>
					<div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
						<ContactLink
							href={`mailto:${RESUME_DATA.email}`}
							icon={<Mail size={13} />}
							label={RESUME_DATA.email}
						/>
						<ContactLink
							href={`tel:${RESUME_DATA.phone.replace(/\s+/g, "")}`}
							icon={<Smartphone size={13} />}
							label={RESUME_DATA.phone}
						/>
						{RESUME_DATA.social.map((s) => (
							<ContactLink
								key={s.name}
								href={s.url}
								external
								icon={socialIcon(s.name)}
								label={s.url
									.replace(/^https?:\/\/(www\.)?/, "")
									.replace(/\/$/, "")}
							/>
						))}
					</div>
				</section>

				{/* Work Experience */}
				<section className="mb-10">
					<SectionHeader>Work experience</SectionHeader>
					<ol className="flex flex-col gap-3">
						{RESUME_DATA.experience.map((exp) => (
							<li
								key={`${exp.company}-${exp.duration.from}`}
								className="pl-4 border-l-2 border-term-blue"
							>
								<div className="flex items-baseline justify-between gap-3 flex-wrap">
									<div className="flex items-baseline gap-2 flex-wrap">
										<span className="text-[14px] font-medium text-term-blue">
											{exp.company}
										</span>
										<span className="text-term-faint">
											·
										</span>
										<span className="text-[13px]">
											{exp.position}
										</span>
										{"location" in exp && exp.location && (
											<>
												<span className="text-term-faint">
													·
												</span>
												<span className="text-[12px] text-term-dim">
													{exp.location}
												</span>
											</>
										)}
									</div>
									<span className="text-[12px] tracking-[0.04em] text-term-faint">
										{formatDuration(
											exp.duration.from,
											exp.duration.to,
										)}
									</span>
								</div>
							</li>
						))}
					</ol>
				</section>

				{/* Certifications */}
				<section className="mb-10">
					<SectionHeader>Certifications</SectionHeader>
					<ul className="flex flex-col gap-2">
						{RESUME_DATA.certifications.map((cert) => (
							<li
								key={cert.name}
								className="text-[13px] flex items-baseline gap-2 flex-wrap"
							>
								<span className="mr-1 text-term-muted">▸</span>
								<span>{cert.name}</span>
								<span className="text-term-faint">·</span>
								<span className="text-term-dim">
									{cert.issuer}
								</span>
								<span className="text-term-faint">·</span>
								<span className="text-term-faint">
									{cert.issued}
								</span>
							</li>
						))}
					</ul>
				</section>

				{/* Education */}
				<section className="mb-10">
					<SectionHeader>Education</SectionHeader>
					<ul className="flex flex-col gap-3">
						{RESUME_DATA.education.map((edu) => (
							<li
								key={edu.name}
								className="pl-4 border-l-2 border-term-blue"
							>
								<div className="flex items-baseline justify-between gap-3 flex-wrap">
									<div className="flex items-baseline gap-2 flex-wrap">
										<span className="text-[13px] font-medium">
											{edu.name}
										</span>
										<span className="text-term-faint">
											·
										</span>
										<span className="text-[13px] text-term-dim">
											{edu.institution}
										</span>
										<span className="text-term-faint">
											·
										</span>
										<span className="text-[12px] text-term-faint">
											{edu.location}
										</span>
									</div>
									<span className="text-[12px] tracking-[0.04em] text-term-faint">
										{formatDuration(
											edu.duration.from,
											edu.duration.to,
										)}
									</span>
								</div>
							</li>
						))}
					</ul>
				</section>

				{/* Skills */}
				<section className="mb-14">
					<SectionHeader>Skills</SectionHeader>
					<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px]">
						{RESUME_DATA.skills.map((s, i) => (
							<span
								key={s.title}
								className="whitespace-nowrap"
							>
								{s.title}
								{i < RESUME_DATA.skills.length - 1 && (
									<span className="ml-3 text-term-faint">
										·
									</span>
								)}
							</span>
						))}
					</div>
				</section>

				{/* Footer */}
				<footer className="pt-6 text-[11px] flex flex-wrap gap-x-5 gap-y-2 print:hidden text-term-faint border-t border-dashed border-term-rule">
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
					<Link
						href="/guestbook"
						className="underline underline-offset-4 text-term-blue"
					>
						→ guestbook
					</Link>
					<a
						href="/resume.pdf"
						className="underline underline-offset-4 text-term-blue"
						download
					>
						↓ resume.pdf
					</a>
				</footer>
			</div>
		</main>
	);
}

function SectionHeader({ children }: { children: React.ReactNode }) {
	return (
		<h2 className="text-[10px] tracking-[0.14em] uppercase font-medium mb-3 text-term-amber">
			── {children}
		</h2>
	);
}

function ContactLink({
	href,
	icon,
	label,
	external,
}: {
	href: string;
	icon: React.ReactNode;
	label: string;
	external?: boolean;
}) {
	return (
		<a
			href={href}
			{...(external
				? { target: "_blank", rel: "noopener noreferrer" }
				: {})}
			className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80 text-term-blue"
		>
			<span className="text-term-faint">{icon}</span>
			<span className="underline underline-offset-4">{label}</span>
		</a>
	);
}

function socialIcon(name: string): React.ReactNode {
	switch (name.toLowerCase()) {
		case "linkedin":
			return <Linkedin size={13} />;
		case "github":
			return <Github size={13} />;
		default:
			return null;
	}
}
