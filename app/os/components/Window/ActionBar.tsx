"use client";

import { cn } from "@/src/lib/utils";
import { ChevronsUpDown, Minus, X } from "lucide-react";
import { useWindowContext } from "./Context";
import { motion } from "motion/react";

type Props = {
	title: string;
};

export default function ActionBar(props: Props) {
	const { handleClose, handleMinimize, setDragEvent } = useWindowContext();

	return (
		<motion.div
			className="flex items-center justify-between px-2 py-2 bg-neutral-900 gap-2"
			onPointerDown={setDragEvent}
		>
			<div className="flex items-center gap-1.5 group">
				<ActionButton
					icon={<X size={10} strokeWidth={4} />}
					className="bg-red-500"
					onClick={() => {
						setDragEvent(null);
						handleClose();
					}}
				/>
				<ActionButton
					icon={<Minus size={10} strokeWidth={4} />}
					className="bg-yellow-400"
					onClick={() => {
						setDragEvent(null);
						handleMinimize();
					}}
				/>
				<ActionButton
					icon={
						<ChevronsUpDown size={10} className="-rotate-45" strokeWidth={4} />
					}
					className="bg-emerald-600"
				/>
			</div>
			<p className="text-white font-medium text-sm">{props.title}</p>
			<div className="w-14" />
		</motion.div>
	);
}

export function ActionButton(props: {
	icon: React.ReactNode;
	className?: string;
	onClick?: () => void;
}) {
	return (
		<button
			type="button"
			className={cn(
				"p-1 h-3 w-3 rounded-full transition-colors cursor-pointer flex items-center justify-center text-gray-800",
				props.className,
			)}
			onClick={props.onClick}
		>
			<div className="hidden group-hover:block transition-transform duration-200">
				{props.icon}
			</div>
		</button>
	);
}
