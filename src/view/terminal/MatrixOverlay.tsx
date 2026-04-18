"use client";

import { useEffect, useRef, useCallback } from "react";

type Props = {
	onClose: () => void;
};

export default function MatrixOverlay({ onClose }: Props) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;

	const close = useCallback(() => {
		onCloseRef.current();
	}, []);

	useEffect(() => {
		const cv = canvasRef.current;
		if (!cv) return;
		const ctx = cv.getContext("2d");
		if (!ctx) return;

		let running = true;

		function size() {
			if (!cv) return;
			cv.width = window.innerWidth;
			cv.height = window.innerHeight;
		}
		size();
		window.addEventListener("resize", size);

		const chars =
			"アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789SEHALSEIN$#><";
		const fs = 16;
		const cols = Math.floor(cv.width / fs);
		const drops = Array(cols)
			.fill(0)
			.map(() => Math.random() * (cv.height / fs));

		const accent =
			getComputedStyle(document.documentElement)
				.getPropertyValue("--term-green")
				.trim() || "#0f0";

		function draw() {
			if (!running || !ctx || !cv) return;
			ctx.fillStyle = "rgba(0,0,0,0.07)";
			ctx.fillRect(0, 0, cv.width, cv.height);
			ctx.fillStyle = accent;
			ctx.font = `${fs}px JetBrains Mono, monospace`;
			for (let i = 0; i < drops.length; i++) {
				const ch = chars[Math.floor(Math.random() * chars.length)];
				ctx.fillText(ch, i * fs, drops[i] * fs);
				if (drops[i] * fs > cv.height && Math.random() > 0.975)
					drops[i] = 0;
				drops[i] += 1;
			}
			requestAnimationFrame(draw);
		}
		draw();

		function handleClose() {
			running = false;
			close();
		}

		const timer = setTimeout(() => {
			window.addEventListener("click", handleClose, { once: true });
			window.addEventListener("keydown", handleClose, { once: true });
		}, 300);

		return () => {
			running = false;
			clearTimeout(timer);
			window.removeEventListener("resize", size);
			window.removeEventListener("click", handleClose);
			window.removeEventListener("keydown", handleClose);
		};
	}, [close]);

	return (
		<div className="fixed inset-0 z-[10000] bg-black cursor-pointer">
			<canvas ref={canvasRef} className="block w-full h-full" />
			<div
				className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[12px] tracking-[0.12em] animate-[blink_1.2s_infinite]"
				style={{
					color: "#0f0",
					fontFamily: "JetBrains Mono, monospace",
				}}
			>
				click or press any key to exit
			</div>
		</div>
	);
}
