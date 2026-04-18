"use client";

import { Info, Monitor, Search, Settings, SquareTerminal } from "lucide-react";
import {
	type ComponentType,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

export type CtxAction = "spotlight" | "terminal" | "settings" | "crt" | "about";

type Props = {
	x: number;
	y: number;
	onClose: () => void;
	onAction: (action: CtxAction) => void;
};

type Item = {
	action: CtxAction;
	label: string;
	icon: ComponentType<{ "aria-hidden"?: boolean | "true" | "false" }>;
	shortcut?: string;
};

const GROUPS: Item[][] = [
	[
		{
			action: "spotlight",
			label: "Open Spotlight",
			icon: Search,
			shortcut: "⌘K",
		},
		{
			action: "terminal",
			label: "New Terminal",
			icon: SquareTerminal,
			shortcut: "⌘T",
		},
	],
	[
		{ action: "settings", label: "Settings…", icon: Settings },
		{
			action: "crt",
			label: "Toggle CRT mode",
			icon: Monitor,
			shortcut: "⇧⌘C",
		},
	],
	[{ action: "about", label: "About this OS", icon: Info }],
];

export default function ContextMenu({ x, y, onClose, onAction }: Props) {
	const ref = useRef<HTMLDivElement>(null);
	const [pos, setPos] = useState({ x, y });

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const r = el.getBoundingClientRect();
		let nx = x;
		let ny = y;
		if (r.right > window.innerWidth) nx = window.innerWidth - r.width - 8;
		if (r.bottom > window.innerHeight) ny = window.innerHeight - r.height - 8;
		if (nx !== x || ny !== y) setPos({ x: nx, y: ny });
	}, [x, y]);

	useEffect(() => {
		const onDown = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) onClose();
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [onClose]);

	const fire = (a: CtxAction) => {
		onAction(a);
		onClose();
	};

	return (
		<div
			ref={ref}
			className="ctx"
			role="menu"
			aria-label="Desktop actions"
			style={{ left: pos.x, top: pos.y }}
		>
			{GROUPS.map((group, gi) => (
				<div key={group[0].action} role="group">
					{group.map(({ action, label, icon: Icon, shortcut }) => (
						<button
							type="button"
							key={action}
							className="item"
							role="menuitem"
							onClick={() => fire(action)}
						>
							<Icon aria-hidden="true" />
							<span>{label}</span>
							{shortcut ? <kbd className="kbd">{shortcut}</kbd> : <span />}
						</button>
					))}
					{gi < GROUPS.length - 1 && (
						<div className="sep" role="separator" aria-hidden="true" />
					)}
				</div>
			))}
		</div>
	);
}
