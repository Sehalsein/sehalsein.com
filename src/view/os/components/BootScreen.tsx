"use client";

import { useEffect, useState } from "react";

const STEPS = ["Workspace", "Preferences", "Applications"];

type Props = { onDone: () => void };

export default function BootScreen({ onDone }: Props) {
	const [step, setStep] = useState(0);
	const [fading, setFading] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const timers: number[] = [];

		STEPS.forEach((_, index) => {
			timers.push(
				window.setTimeout(() => {
					if (!cancelled) setStep(index + 1);
				}, 220 + index * 240),
			);
		});

		timers.push(
			window.setTimeout(() => {
				if (cancelled) return;
				setFading(true);
				timers.push(window.setTimeout(() => !cancelled && onDone(), 360));
			}, 1040),
		);

		return () => {
			cancelled = true;
			timers.forEach((timer) => window.clearTimeout(timer));
		};
	}, [onDone]);

	return (
		<div className={`boot-screen${fading ? " done" : ""}`}>
			<div className="boot-brand" aria-label="sehalOS">
				<span>S</span>
				<strong>sehalOS</strong>
			</div>
			<p>Preparing your workspace</p>
			<div className="boot-progress" aria-label="Loading workspace">
				<span style={{ width: `${(step / STEPS.length) * 100}%` }} />
			</div>
			<div className="boot-steps" aria-hidden="true">
				{STEPS.map((label, index) => (
					<span key={label} className={index < step ? "ready" : ""}>
						{label}
					</span>
				))}
			</div>
		</div>
	);
}
