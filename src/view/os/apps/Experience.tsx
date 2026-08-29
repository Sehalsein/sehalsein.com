"use client";

import { RESUME_DATA } from "@/src/data/resume";

export default function Experience() {
	const currentYear = new Date().getFullYear();
	return (
		<div className="app-xp">
			<header className="xp-header">
				<div>
					<span>Career timeline</span>
					<h2>Experience</h2>
				</div>
				<p>{RESUME_DATA.experience.length} roles · 7+ years building</p>
			</header>
			<div className="timeline">
				{RESUME_DATA.experience.map((exp, i) => {
					const toYear = exp.duration.to;
					const when = toYear
						? `${exp.duration.from} — ${toYear}`
						: `${exp.duration.from} — present`;
					const old = toYear !== undefined && toYear < currentYear - 1;
					return (
						<div
							key={`${exp.company}-${i}`}
							className={`job${old ? " old" : ""}`}
						>
							<div className="job-head">
								<div className="job-mark">{exp.company[0]}</div>
								<div>
									<div className="co">{exp.company}</div>
									<div className="ro">
										{exp.position}
										{exp.location ? ` · ${exp.location}` : ""}
									</div>
								</div>
								<div className="when">{when}</div>
							</div>
							{exp.description.length > 0 && (
								<ul>
									{exp.description.map((d) => (
										<li key={d}>{d}</li>
									))}
								</ul>
							)}
						</div>
					);
				})}
			</div>
			<a href="/resume" className="dl">
				Open full résumé <span>↗</span>
			</a>
		</div>
	);
}
