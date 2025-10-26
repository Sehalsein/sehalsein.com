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
import type { Tab } from "./type";

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
							{tab.page.title}
						</TabButton>
					))}
					<div className="text-xs text-stone-100 justify-center h-8 relative w-10">
						<button
							className="text-xs text-stone-100 hover:bg-neutral-700 rounded-full p-2 absolute top-1/2 -translate-y-1/2 left-0"
							type="button"
							onClick={addTab}
						>
							<Plus size={10} strokeWidth={4} />
						</button>
					</div>
				</div>
			</motion.div>
			<AddressBar
				activeTab={activeTab}
				onNavigate={(url) => activeTab.push(url)}
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
				"text-xs text-stone-100 px-2 pb-2 pt-1.5 flex items-center gap-1 w-32 justify-between relative",
				props.isActive && "bg-neutral-800 rounded-md rounded-b-none",
			)}
		>
			<button
				type="button"
				className="w-full text-left truncate pr-4"
				onClick={props.onClick}
			>
				{props.children}
			</button>
			<button
				type="button"
				className="hover:bg-neutral-700 rounded-full p-1 absolute right-2 top-1/2 -translate-y-1/2 transition-colors text-stone-100 disabled:opacity-50 disabled:cursor-not-allowed"
				onClick={props.onClose}
			>
				<X size={10} strokeWidth={4} />
			</button>
		</div>
	);
}

function AddressBar(props: {
	activeTab: ReturnType<typeof useBrowserContext>["activeTab"];
	onNavigate: (url: string) => void;
}) {
	const [value, setValue] = useState(props.activeTab.page.url);
	const [showInput, setShowInput] = useState(false);

	useEffect(() => {
		setValue(props.activeTab.page.url);
	}, [props.activeTab.page.url]);

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
				<NavigationButton
					icon={<ArrowLeft size={14} />}
					onClick={props.activeTab.goBack}
					disabled={!props.activeTab.goBack}
				/>
				<NavigationButton
					icon={<ArrowRight size={14} />}
					onClick={props.activeTab.goForward}
					disabled={!props.activeTab.goForward}
				/>
				<NavigationButton
					icon={
						<RefreshCcw
							size={14}
							className={cn(props.activeTab.isLoading && "animate-spin")}
						/>
					}
					onClick={props.activeTab.refresh}
				/>
				<NavigationButton
					icon={<Home size={14} />}
					onClick={props.activeTab.home}
				/>
				<div className="bg-neutral-700 rounded-full w-full px-2 py-1 text-stone-100 text-sm ml-2">
					{match(showInput)
						.with(true, () => (
							<input
								className="bg-transparent outline-none w-full"
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
							<button
								type="button"
								className="text-left w-full bg-transparent outline-none"
								onClick={() => setShowInput(true)}
							>
								{value}
							</button>
						))
						.otherwise(() => null)}
				</div>
			</div>
		</div>
	);
}

function NavigationButton(props: {
	icon: React.ReactNode;
	onClick?: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			className="hover:bg-neutral-700 rounded-full p-2 transition-colors text-stone-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
			onClick={props.onClick}
			disabled={props.disabled}
		>
			{props.icon}
		</button>
	);
}
