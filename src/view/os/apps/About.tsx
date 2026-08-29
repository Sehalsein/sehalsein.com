"use client";

import { RESUME_DATA } from "@/src/data/resume";

const SKILLS = RESUME_DATA.skills.slice(0, 12).map((s) => s.title.toLowerCase());

export default function About() {
	const initials = RESUME_DATA.name
		.split(" ")
		.map((p) => p[0])
		.join("")
		.toUpperCase();
	const currentRole = RESUME_DATA.experience[0]?.position ?? "Software Engineer";
	return (
		<div className="app-about">
			<div className="hero about-hero">
				<div className="about-identity">
					<div className="avatar">{initials}</div>
					<div>
						<div className="about-eyebrow">Profile</div>
						<h1>{RESUME_DATA.name}</h1>
						<div className="role">
							{currentRole} · {RESUME_DATA.location}
						</div>
					</div>
				</div>
				<div className="about-status">
					<span aria-hidden="true" /> Available for thoughtful conversations
				</div>
			</div>
			<div className="body">
				<div className="about-copy">
					<div className="about-eyebrow">A little context</div>
					<div className="about-copy-text">
						<p className="about-lede">
							I care about <b>building things that matter</b> and making
							technology more <b>accessible</b>.
						</p>
						<p>
							Most of my work lives in the full-stack space — from crafting
							careful frontends to building scalable backend systems that handle
							real-world load. I&apos;ve worked across <em>gaming</em>,{" "}
							<em>data analytics</em>, <em>fitness tech</em>, and{" "}
							<em>consulting</em>.
						</p>
						<p>
							I co-founded <b>DGymBook</b>, a gym platform serving 50,000+
							users. I believe in <b>small teams</b>, <b>shipping fast</b>, and
							writing code someone else can understand without a tour guide.
						</p>
					</div>
				</div>
				<div className="about-facts">
					<div><strong>7+</strong><span>years shipping</span></div>
					<div><strong>50K+</strong><span>users served</span></div>
					<div><strong>150K</strong><span>concurrent scale</span></div>
				</div>
				<div className="about-eyebrow about-stack-label">Tools I reach for</div>
				<div className="stack">
					{SKILLS.map((skill) => (
						<span key={skill}>{skill}</span>
					))}
				</div>
			</div>
			<div className="links">
				<a href={`mailto:${RESUME_DATA.email}`}>
					<span className="about-link-label">email</span>
					<span>{RESUME_DATA.email}</span>
				</a>
				{RESUME_DATA.social.map((s) => (
					<a
						key={s.name}
						href={s.url}
						target="_blank"
						rel="noopener noreferrer"
					>
						<span className="about-link-label">{s.name.toLowerCase()}</span>
						<span>↗</span>
					</a>
				))}
				<a href="/resume">
					<span className="about-link-label">resume</span>
					<span>↗</span>
				</a>
			</div>
		</div>
	);
}
