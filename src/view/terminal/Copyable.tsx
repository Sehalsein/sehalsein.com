"use client";

import { useState, type CSSProperties, type ReactNode } from "react";

type Props = {
	value: string;
	children?: ReactNode;
	as?: "pre" | "span";
	className?: string;
	style?: CSSProperties;
	title?: string;
};

export default function Copyable({
	value,
	children,
	as = "pre",
	className,
	style,
	title = "click to copy",
}: Props) {
	const [copied, setCopied] = useState(false);

	const handleClick = async (e?: React.MouseEvent) => {
		e?.stopPropagation();
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 1200);
		} catch {
			// noop — if clipboard blocked, nothing happens
		}
	};

	const commonProps = {
		onClick: (e: React.MouseEvent) => handleClick(e),
		title,
		className: `${className ?? ""} cursor-pointer select-text`,
		style: {
			...style,
			position: "relative" as const,
		},
		role: "button" as const,
		tabIndex: 0,
		onKeyDown: (e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				handleClick();
			}
		},
	};

	const indicator = (
		<span
			className="absolute top-1 right-2 text-[10px] px-1.5 py-[1px] tracking-[0.08em] uppercase"
			style={{
				background: "var(--term-bg)",
				color: copied ? "var(--term-green)" : "var(--term-dim)",
				opacity: copied ? 1 : 0.7,
				transition: "color 120ms ease-out",
			}}
		>
			{copied ? "✓ copied" : "⧉ copy"}
		</span>
	);

	if (as === "span") {
		return (
			<span {...commonProps}>
				{children ?? value}
				{copied && (
					<span
						className="ml-2 text-[10px]"
						style={{ color: "var(--term-green)" }}
					>
						✓ copied
					</span>
				)}
			</span>
		);
	}

	return (
		<pre {...commonProps}>
			{indicator}
			{children ?? value}
		</pre>
	);
}
