"use client";

import { useEffect, useState } from "react";

const BOOT_LINES = [
	"loading /etc/sehalos/init.conf",
	"mounting /home/sehal on /",
	"starting system.keyboard",
	"starting system.display",
	"starting system.network",
	"starting shell.service",
	"initializing desktop environment",
	"welcome, sehal",
];

type Props = { onDone: () => void };

export default function BootScreen({ onDone }: Props) {
	const [shown, setShown] = useState(0);
	const [fading, setFading] = useState(false);

	useEffect(() => {
		let cancelled = false;
		let i = 0;
		const tick = () => {
			if (cancelled) return;
			setShown(i + 1);
			i++;
			if (i < BOOT_LINES.length) {
				setTimeout(tick, 130 + Math.random() * 120);
			} else {
				setTimeout(() => {
					if (cancelled) return;
					setFading(true);
					setTimeout(() => !cancelled && onDone(), 400);
				}, 400);
			}
		};
		setTimeout(tick, 130);
		return () => {
			cancelled = true;
		};
	}, [onDone]);

	return (
		<div className={`boot-screen${fading ? " done" : ""}`}>
			<div className="logo">sehalOS</div>
			<div className="lines">
				{BOOT_LINES.slice(0, shown).map((line, i) => (
					<div key={line} className="l">
						<span className="text-[color:var(--faint)]">
							[ {String(i * 0.13 + 0.01).padStart(5, "0")} ]
						</span>
						<span className="ok">[ OK ]</span> {line}
					</div>
				))}
			</div>
			<div className="bar" />
		</div>
	);
}
