"use client";

import { RESUME_DATA } from "@/src/data/resume";

const SKILLS = RESUME_DATA.skills.slice(0, 12).map((s) => s.title.toLowerCase());

export default function About() {
	const initials = RESUME_DATA.name
		.split(" ")
		.map((p) => p[0])
		.join("")
		.toUpperCase();
	return (
		<div className="app-about">
			<div className="hero">
				<div className="avatar">{initials}</div>
				<h1>{RESUME_DATA.name}</h1>
				<div className="role">senior software engineer · {RESUME_DATA.location.toLowerCase()}</div>
				<div className="tag">open to chats</div>
			</div>
			<div className="body">
				<p>
					I care about <b>building things that matter</b> and making
					technology more <b>accessible</b>. Most of my work lives in the
					full-stack space — from crafting pixel-perfect frontends to
					building scalable backend systems that handle real-world load.
				</p>
				<p>
					I&apos;ve spent time across <em>gaming</em>, <em>data analytics</em>
					, <em>fitness tech</em>, and <em>consulting</em>. I co-founded{" "}
					<b>DGymBook</b>, a gym platform serving 50,000+ users. I like
					working on problems that push me — whether that&apos;s scaling
					servers to 150K concurrent users or building deployment pipelines
					that just work.
				</p>
				<p>
					Outside work: video games, thinking about the next thing to build,
					and occasionally touching grass. I believe in <b>small teams</b>,{" "}
					<b>shipping fast</b>, and writing code someone else can understand
					without a tour guide.
				</p>
				<div className="stack">
					{SKILLS.map((skill) => (
						<span key={skill}>{skill}</span>
					))}
				</div>
			</div>
			<div className="links">
				<a href={`mailto:${RESUME_DATA.email}`}>
					<span>email</span>
					<span>{RESUME_DATA.email}</span>
				</a>
				{RESUME_DATA.social.map((s) => (
					<a
						key={s.name}
						href={s.url}
						target="_blank"
						rel="noopener noreferrer"
					>
						<span>{s.name.toLowerCase()}</span>
						<span>↗</span>
					</a>
				))}
				<a href="/resume">
					<span>resume</span>
					<span>↗</span>
				</a>
			</div>
		</div>
	);
}
