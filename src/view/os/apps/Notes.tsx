"use client";

import { useState } from "react";
import { NOW_LAST_UPDATED, NOW_SECTIONS } from "@/src/data/now";

export default function Notes() {
	const [idx, setIdx] = useState(0);
	const note = NOW_SECTIONS[idx];

	return (
		<div className="app-notes">
			<div className="list">
				{NOW_SECTIONS.map((n, i) => (
					<button
						type="button"
						key={n.id}
						className={`n${i === idx ? " active" : ""}`}
						onClick={() => setIdx(i)}
					>
						<div className="t">{n.title}</div>
						<div className="s">as of {NOW_LAST_UPDATED}</div>
					</button>
				))}
			</div>
			<div className="body">
				<h1>{note.title}</h1>
				<div className="meta">updated {NOW_LAST_UPDATED}</div>
				<ul className="pl-5 text-[13px] leading-[1.65] text-[color:var(--ink)]">
					{note.items.map((item) => (
						<li key={item} className="mb-1.5">
							{item}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
