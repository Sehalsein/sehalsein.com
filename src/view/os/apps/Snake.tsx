"use client";

import { useEffect, useRef, useState } from "react";

const N = 21;
const SIZE = 420;
const S = SIZE / N;

type Cell = [number, number];

export default function Snake() {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [score, setScore] = useState(0);
	const [best, setBest] = useState(0);
	const [speed, setSpeed] = useState(1);
	const bestRef = useRef(0);

	const stateRef = useRef({
		snake: [
			[10, 10],
			[9, 10],
			[8, 10],
		] as Cell[],
		dir: [1, 0] as [number, number],
		ndir: [1, 0] as [number, number],
		food: [15, 10] as Cell,
		running: true,
		alive: true,
		speed: 1,
	});

	useEffect(() => {
		const saved = Number(localStorage.getItem("snakeBest") || "0");
		bestRef.current = saved;
		setBest(saved);
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const css = getComputedStyle(document.documentElement);
		const color = (name: string, fallback: string) =>
			css.getPropertyValue(name).trim() || fallback;

		function spawn(snake: Cell[]): Cell {
			while (true) {
				const p: Cell = [
					Math.floor(Math.random() * N),
					Math.floor(Math.random() * N),
				];
				if (!snake.some((s) => s[0] === p[0] && s[1] === p[1])) return p;
			}
		}

		function reset() {
			const st = stateRef.current;
			st.snake = [
				[10, 10],
				[9, 10],
				[8, 10],
			];
			st.dir = [1, 0];
			st.ndir = [1, 0];
			st.alive = true;
			st.speed = 1;
			st.food = spawn(st.snake);
			setScore(0);
			setSpeed(1);
		}

		function draw() {
			const st = stateRef.current;
			if (!ctx) return;
			ctx.fillStyle = color("--bg-2", "#0f110e");
			ctx.fillRect(0, 0, SIZE, SIZE);
			// Actually read scoped palette from .os-root if possible
			const osRoot = document.querySelector<HTMLElement>(".os-root");
			const read = (name: string, fallback: string) => {
				if (osRoot) {
					const v = getComputedStyle(osRoot).getPropertyValue(name).trim();
					if (v) return v;
				}
				return color(name, fallback);
			};
			ctx.fillStyle = read("--bg-2", "#0f110e");
			ctx.fillRect(0, 0, SIZE, SIZE);
			ctx.fillStyle = read("--amber", "#d9a05b");
			ctx.fillRect(st.food[0] * S + 2, st.food[1] * S + 2, S - 4, S - 4);
			st.snake.forEach((s, i) => {
				ctx.fillStyle = read("--green", "#9ece6a");
				ctx.globalAlpha = i === 0 ? 1 : Math.max(0.35, 1 - i * 0.04);
				ctx.fillRect(s[0] * S + 1, s[1] * S + 1, S - 2, S - 2);
				ctx.globalAlpha = 1;
			});
			if (!st.alive) {
				ctx.fillStyle = "rgba(0,0,0,0.7)";
				ctx.fillRect(0, 0, SIZE, SIZE);
				ctx.fillStyle = read("--red", "#e46767");
				ctx.font = "bold 28px JetBrains Mono";
				ctx.textAlign = "center";
				ctx.fillText("GAME OVER", SIZE / 2, SIZE / 2 - 8);
				ctx.font = "12px JetBrains Mono";
				ctx.fillStyle = read("--dim", "#999");
				ctx.fillText("press any key to restart", SIZE / 2, SIZE / 2 + 18);
			}
		}

		function step() {
			const st = stateRef.current;
			if (!st.running || !st.alive) return;
			st.dir = st.ndir;
			const h: Cell = [st.snake[0][0] + st.dir[0], st.snake[0][1] + st.dir[1]];
			if (h[0] < 0 || h[0] >= N || h[1] < 0 || h[1] >= N) {
				st.alive = false;
				draw();
				return;
			}
			if (st.snake.some((s) => s[0] === h[0] && s[1] === h[1])) {
				st.alive = false;
				draw();
				return;
			}
			st.snake.unshift(h);
			if (h[0] === st.food[0] && h[1] === st.food[1]) {
				st.food = spawn(st.snake);
				setScore((n) => {
					const next = n + 1;
					st.speed = 1 + Math.floor(next / 5) * 0.3;
					setSpeed(Number(st.speed.toFixed(1)));
					if (next > bestRef.current) {
						bestRef.current = next;
						setBest(next);
						localStorage.setItem("snakeBest", String(next));
					}
					return next;
				});
			} else {
				st.snake.pop();
			}
			draw();
		}

		const onKey = (e: KeyboardEvent) => {
			const st = stateRef.current;
			if (!st.alive) {
				reset();
				draw();
				return;
			}
			const k = e.key;
			if (k === "ArrowUp" && st.dir[1] !== 1) st.ndir = [0, -1];
			if (k === "ArrowDown" && st.dir[1] !== -1) st.ndir = [0, 1];
			if (k === "ArrowLeft" && st.dir[0] !== 1) st.ndir = [-1, 0];
			if (k === "ArrowRight" && st.dir[0] !== -1) st.ndir = [1, 0];
			if (k === " ") {
				e.preventDefault();
				st.running = !st.running;
			}
			if (
				["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(k)
			) {
				e.preventDefault();
			}
		};

		reset();
		draw();
		const base = setInterval(step, 100);
		const boost = setInterval(() => {
			if (stateRef.current.speed > 1) step();
		}, 70);
		document.addEventListener("keydown", onKey);
		return () => {
			clearInterval(base);
			clearInterval(boost);
			document.removeEventListener("keydown", onKey);
		};
	}, []);

	return (
		<div className="app-snake">
			<div className="hud">
				<span>
					SCORE <b>{score}</b>
				</span>
				<span>
					BEST <b>{best}</b>
				</span>
				<span>
					SPEED <b>{speed}x</b>
				</span>
			</div>
			<canvas
				ref={canvasRef}
				width={SIZE}
				height={SIZE}
				tabIndex={0}
				aria-label="snake game"
			/>
			<div className="tip">arrow keys · space to pause · click inside first</div>
		</div>
	);
}
