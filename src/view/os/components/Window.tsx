"use client";

import {
	type PointerEvent as RPointerEvent,
	type ReactNode,
	useCallback,
	useRef,
} from "react";
import { useOSStore, type WindowState } from "./Window/store";

type Props = {
	window: WindowState;
	title: string;
	icon: ReactNode;
	children: ReactNode;
};

export default function Window({ window: w, title, icon, children }: Props) {
	const focusWindow = useOSStore((s) => s.focusWindow);
	const closeWindow = useOSStore((s) => s.closeWindow);
	const minimize = useOSStore((s) => s.minimize);
	const toggleMax = useOSStore((s) => s.toggleMax);
	const setPosition = useOSStore((s) => s.setPosition);
	const setSize = useOSStore((s) => s.setSize);
	const order = useOSStore((s) => s.order);
	const focused = useOSStore((s) => s.focused);

	const zIndex = 100 + order.indexOf(w.instanceId);
	const isFocused = focused === w.instanceId;

	const ref = useRef<HTMLDivElement>(null);
	const dragState = useRef<{ dx: number; dy: number } | null>(null);
	const resizeState = useRef<{ startW: number; startH: number; startX: number; startY: number } | null>(null);

	const onTitlePointerDown = useCallback(
		(e: RPointerEvent<HTMLDivElement>) => {
			if ((e.target as HTMLElement).closest(".dots")) return;
			if (!ref.current) return;
			if (w.maximized) toggleMax(w.instanceId);
			const rect = ref.current.getBoundingClientRect();
			dragState.current = {
				dx: e.clientX - rect.left,
				dy: e.clientY - rect.top,
			};
			focusWindow(w.instanceId);
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
			e.preventDefault();
		},
		[w.instanceId, w.maximized, toggleMax, focusWindow],
	);

	const onTitlePointerMove = useCallback(
		(e: RPointerEvent<HTMLDivElement>) => {
			if (!dragState.current) return;
			const x = Math.max(
				0,
				Math.min(globalThis.innerWidth - 120, e.clientX - dragState.current.dx),
			);
			const y = Math.max(
				30,
				Math.min(globalThis.innerHeight - 40, e.clientY - dragState.current.dy),
			);
			setPosition(w.instanceId, { x, y });
		},
		[w.instanceId, setPosition],
	);

	const onTitlePointerUp = useCallback(() => {
		dragState.current = null;
	}, []);

	const onTitleDoubleClick = useCallback(
		(e: React.MouseEvent) => {
			if ((e.target as HTMLElement).closest(".dots")) return;
			toggleMax(w.instanceId);
		},
		[w.instanceId, toggleMax],
	);

	const onResizePointerDown = useCallback(
		(e: RPointerEvent<HTMLDivElement>) => {
			resizeState.current = {
				startW: w.size.width,
				startH: w.size.height,
				startX: e.clientX,
				startY: e.clientY,
			};
			(e.target as HTMLElement).setPointerCapture(e.pointerId);
			e.preventDefault();
			e.stopPropagation();
		},
		[w.size.width, w.size.height],
	);

	const onResizePointerMove = useCallback(
		(e: RPointerEvent<HTMLDivElement>) => {
			if (!resizeState.current) return;
			const width = Math.max(
				280,
				resizeState.current.startW + (e.clientX - resizeState.current.startX),
			);
			const height = Math.max(
				180,
				resizeState.current.startH + (e.clientY - resizeState.current.startY),
			);
			setSize(w.instanceId, { width, height });
		},
		[w.instanceId, setSize],
	);

	const onResizePointerUp = useCallback(() => {
		resizeState.current = null;
	}, []);

	const className = [
		"os-window",
		isFocused ? "focused" : "",
		w.opening ? "opening" : "",
		w.closing ? "closing" : "",
		w.minimized ? "min" : "",
		w.maximized ? "max" : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div
			ref={ref}
			className={className}
			style={{
				left: w.position.x,
				top: w.position.y,
				width: w.size.width,
				height: w.size.height,
				zIndex,
			}}
			onMouseDown={() => focusWindow(w.instanceId)}
		>
			<div
				className="titlebar"
				onPointerDown={onTitlePointerDown}
				onPointerMove={onTitlePointerMove}
				onPointerUp={onTitlePointerUp}
				onPointerCancel={onTitlePointerUp}
				onDoubleClick={onTitleDoubleClick}
			>
				<div className="dots">
					<button
						type="button"
						className="d1"
						aria-label={`Close ${title}`}
						onClick={(e) => {
							e.stopPropagation();
							closeWindow(w.instanceId);
						}}
					/>
					<button
						type="button"
						className="d2"
						aria-label={`Minimize ${title}`}
						onClick={(e) => {
							e.stopPropagation();
							minimize(w.instanceId);
						}}
					/>
					<button
						type="button"
						className="d3"
						aria-label={w.maximized ? `Unmaximize ${title}` : `Maximize ${title}`}
						aria-pressed={w.maximized}
						onClick={(e) => {
							e.stopPropagation();
							toggleMax(w.instanceId);
						}}
					/>
				</div>
				<div className="title">{title}</div>
				<div className="t-right" aria-hidden="true">
					{icon}
				</div>
			</div>
			<div className="os-content">{children}</div>
			<div
				className="resize"
				role="separator"
				aria-label="Resize window"
				aria-orientation="vertical"
				onPointerDown={onResizePointerDown}
				onPointerMove={onResizePointerMove}
				onPointerUp={onResizePointerUp}
				onPointerCancel={onResizePointerUp}
			/>
		</div>
	);
}
