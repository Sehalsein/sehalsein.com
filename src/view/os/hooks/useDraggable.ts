"use client";

import {
	type CSSProperties,
	type PointerEvent as RPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

type Pos = { x: number; y: number };

const KEY_PREFIX = "os-widget-pos-";

export function useDraggable(id: string) {
	const [pos, setPos] = useState<Pos | null>(null);
	const ref = useRef<HTMLDivElement>(null);
	const dragState = useRef<{ dx: number; dy: number } | null>(null);

	useEffect(() => {
		try {
			const raw = localStorage.getItem(KEY_PREFIX + id);
			if (raw) setPos(JSON.parse(raw));
		} catch {
			/* ignore */
		}
	}, [id]);

	const onPointerDown = useCallback(
		(e: RPointerEvent<HTMLDivElement>) => {
			if (!ref.current) return;
			const target = e.target as HTMLElement;
			if (target.closest("button, a, input, textarea, select")) return;
			const rect = ref.current.getBoundingClientRect();
			dragState.current = {
				dx: e.clientX - rect.left,
				dy: e.clientY - rect.top,
			};
			setPos({ x: rect.left, y: rect.top });
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
			e.preventDefault();
		},
		[],
	);

	const onPointerMove = useCallback(
		(e: RPointerEvent<HTMLDivElement>) => {
			if (!dragState.current || !ref.current) return;
			const rect = ref.current.getBoundingClientRect();
			const maxX = globalThis.innerWidth - rect.width;
			const maxY = globalThis.innerHeight - rect.height;
			const x = Math.max(0, Math.min(maxX, e.clientX - dragState.current.dx));
			const y = Math.max(30, Math.min(maxY, e.clientY - dragState.current.dy));
			setPos({ x, y });
		},
		[],
	);

	const onPointerUp = useCallback(() => {
		if (!dragState.current) return;
		dragState.current = null;
		setPos((p) => {
			if (p) {
				try {
					localStorage.setItem(KEY_PREFIX + id, JSON.stringify(p));
				} catch {
					/* ignore */
				}
			}
			return p;
		});
	}, [id]);

	const style: CSSProperties | undefined = pos
		? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" }
		: undefined;

	return {
		ref,
		style,
		dragHandlers: {
			onPointerDown,
			onPointerMove,
			onPointerUp,
			onPointerCancel: onPointerUp,
		},
	};
}
