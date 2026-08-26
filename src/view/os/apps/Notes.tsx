"use client";

import { useState } from "react";
import { NOW_LAST_UPDATED, NOW_SECTIONS } from "@/src/data/now";

export default function Notes() {
	const [idx, setIdx] = useState(0);
	const note = NOW_SECTIONS[idx];

	return (
		<div className="app-notes">
			<div className="list">
				<header className="notes-list-header">
					<span>Personal</span>
					<strong>Now notes</strong>
				</header>
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
				<div className="notes-paper-head">
					<div>
						<span className="notes-kicker">Current focus</span>
						<h1>{note.title}</h1>
					</div>
					<div className="meta">updated {NOW_LAST_UPDATED}</div>
				</div>
				<ul className="notes-items">
					{note.items.map((item) => (
						<li key={item}>
							<span aria-hidden="true" />
							{item}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
