"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { APPS, DOCK_ORDER, type AppId } from "../apps/registry";

type Props = {
	onClose: () => void;
	onOpen: (appId: AppId) => void;
};

export default function Spotlight({ onClose, onOpen }: Props) {
	const [query, setQuery] = useState("");
	const [sel, setSel] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const titleId = useId();
	const listId = useId();

	const items = useMemo(() => {
		const q = query.toLowerCase();
		const ids = DOCK_ORDER.filter((id): id is AppId => id !== "sep");
		return ids
			.map((id) => ({ id, ...APPS[id] }))
			.filter((a) => a.name.toLowerCase().includes(q) || a.id.includes(q));
	}, [query]);

	useEffect(() => {
		const t = setTimeout(() => inputRef.current?.focus(), 20);
		return () => clearTimeout(t);
	}, []);

	useEffect(() => {
		setSel(0);
	}, [query]);

	const activeId = items[sel] ? `${listId}-${items[sel].id}` : undefined;

	return (
		<div
			className="spotlight-bg"
			onClick={onClose}
			role="presentation"
		>
			<div
				className="spotlight"
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				onClick={(e) => e.stopPropagation()}
			>
				<span id={titleId} className="sr-only">
					Spotlight search
				</span>
				<div className="input-wrap">
					<Search aria-hidden="true" />
					<input
						ref={inputRef}
						type="search"
						placeholder="Search apps, projects, commands…"
						autoComplete="off"
						autoCorrect="off"
						autoCapitalize="off"
						spellCheck={false}
						role="combobox"
						aria-expanded
						aria-controls={listId}
						aria-activedescendant={activeId}
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "ArrowDown") {
								setSel((s) => Math.min(items.length - 1, s + 1));
								e.preventDefault();
							} else if (e.key === "ArrowUp") {
								setSel((s) => Math.max(0, s - 1));
								e.preventDefault();
							} else if (e.key === "Enter") {
								const it = items[sel];
								if (it) {
									onClose();
									onOpen(it.id);
								}
							} else if (e.key === "Escape") {
								onClose();
							}
						}}
					/>
				</div>
				<ul
					id={listId}
					className="results"
					role="listbox"
					aria-label="Applications"
				>
					{items.map((a, i) => {
						const Icon = a.icon;
						const selected = i === sel;
						return (
							<li
								key={a.id}
								id={`${listId}-${a.id}`}
								role="option"
								aria-selected={selected}
							>
								<button
									type="button"
									className={`item${selected ? " sel" : ""}`}
									onMouseEnter={() => setSel(i)}
									onClick={() => {
										onClose();
										onOpen(a.id);
									}}
								>
									<span className="ic" aria-hidden="true">
										<Icon />
									</span>
									<span className="nm">{a.name}</span>
									<span className="dc">Application</span>
								</button>
							</li>
						);
					})}
				</ul>
				<div className="footer" aria-hidden="true">
					<span>
						<kbd className="k">↵</kbd>open
					</span>
					<span>
						<kbd className="k">↑↓</kbd>navigate
					</span>
					<span>
						<kbd className="k">esc</kbd>close
					</span>
				</div>
			</div>
		</div>
	);
}
