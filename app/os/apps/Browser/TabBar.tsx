"use client";

import { motion } from "motion/react";
import {
	ArrowLeft,
	ArrowRight,
	ChevronsUpDown,
	Home,
	Minus,
	Plus,
	RefreshCcw,
	X,
} from "lucide-react";
import { ActionButton } from "../../components/Window/ActionBar";
import { useWindowContext } from "../../components/Window/Context";
import { useBrowserContext } from "./Context";
import type { PropsWithChildren } from "react";
import { cn } from "@/src/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { match } from "ts-pattern";

export default function TabBar() {
	const { handleClose, handleMinimize, setDragEvent } = useWindowContext();
	const { tabs, activeTab, removeTab, setActiveTab, addTab } =
		useBrowserContext();

	return (
		<div>
			<motion.div
				className="flex px-2 bg-neutral-900 gap-2"
				onPointerDown={setDragEvent}
			>
				<div className="flex items-center gap-1.5 group py-3">
					<ActionButton
						icon={<X size={10} strokeWidth={4} />}
						className="bg-red-500"
						onClick={() => handleClose()}
					/>
					<ActionButton
						icon={<Minus size={10} strokeWidth={4} />}
						className="bg-yellow-400"
						onClick={() => handleMinimize()}
					/>
					<ActionButton
						icon={
							<ChevronsUpDown
								size={10}
								className="-rotate-45"
								strokeWidth={4}
							/>
						}
						className="bg-emerald-600"
					/>
				</div>
				<div className="flex items-end">
					{tabs.map((tab) => (
						<TabButton
							isActive={activeTab.id === tab.id}
							key={tab.id}
							onClose={() => removeTab(tab.id)}
							onClick={() => setActiveTab(tab)}
						>
							{tab.title}
						</TabButton>
					))}
					<button
						className="text-xs text-stone-100 px-2 py-2.5 flex items-center gap-1 justify-between"
						type="button"
						onClick={addTab}
					>
						<Plus size={10} strokeWidth={4} />
					</button>
				</div>
			</motion.div>
			<AddressBar
				activeTab={activeTab}
				onNavigate={(url) => setActiveTab({ ...activeTab, url })}
			/>
		</div>
	);
}

function TabButton(
	props: PropsWithChildren<{
		isActive: boolean;
		onClose: () => void;
		onClick: () => void;
	}>,
) {
	return (
		<div
			className={cn(
				"text-xs text-stone-100 px-2 pb-2 pt-1.5 flex items-center gap-1 w-32 justify-between",
				props.isActive && "bg-neutral-800 rounded-md rounded-b-none",
			)}
		>
			<button
				type="button"
				className="w-full text-left"
				onClick={props.onClick}
			>
				{props.children}
			</button>
			<button type="button" onClick={props.onClose}>
				<X size={10} strokeWidth={4} />
			</button>
		</div>
	);
}

type Tab = {
	id: string;
	url: string;
	title: string;
};

function AddressBar(props: {
	activeTab: Tab;
	onNavigate: (url: string) => void;
}) {
	const [value, setValue] = useState(props.activeTab.url);
	const [showInput, setShowInput] = useState(false);

	useEffect(() => {
		setValue(props.activeTab.url);
	}, [props.activeTab.url]);

	const onSubmit = useCallback(() => {
		let url = value.trim();

		if (!url.startsWith("http")) {
			url = `https://${url}`;
		}

		props.onNavigate(url);
		setShowInput(false);
	}, [value, props.onNavigate]);

	return (
		<div className="bg-neutral-900">
			<div className="flex items-center w-full bg-neutral-800 py-1 px-1 pr-2 rounded-t-xl">
				<NavigationButton icon={<ArrowLeft size={14} />} />
				<NavigationButton icon={<ArrowRight size={14} />} />
				<NavigationButton icon={<RefreshCcw size={14} />} />
				<NavigationButton icon={<Home size={14} />} />
				<div className="bg-neutral-700 rounded-full w-full px-2 py-1 text-stone-100 text-sm ml-2">
					{match(showInput)
						.with(true, () => (
							<input
								value={value}
								onChange={(e) => setValue(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										onSubmit();
									}
								}}
							/>
						))
						.with(false, () => (
							<button type="button" onClick={() => setShowInput(true)}>
								{value}
							</button>
						))
						.otherwise(() => null)}
				</div>
			</div>
		</div>
	);
}

function NavigationButton(props: { icon: React.ReactNode }) {
	return (
		<button
			type="button"
			className="hover:bg-neutral-700 rounded-full p-2 transition-colors text-stone-100"
		>
			{props.icon}
		</button>
	);
}
