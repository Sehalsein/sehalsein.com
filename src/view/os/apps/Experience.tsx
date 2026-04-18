"use client";

import { RESUME_DATA } from "@/src/data/resume";

export default function Experience() {
	const currentYear = new Date().getFullYear();
	return (
		<div className="app-xp">
			<h2>Experience</h2>
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
							<div className="when">{when}</div>
							<div className="co">{exp.company.toLowerCase()}</div>
							<div className="ro">
								{exp.position.toLowerCase()}
								{exp.location ? ` · ${exp.location.toLowerCase()}` : ""}
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
				↓ open resume
			</a>
		</div>
	);
}
