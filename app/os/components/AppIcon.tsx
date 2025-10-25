"use client";

import type React from "react";
import { motion } from "motion/react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { cn } from "@/src/lib/utils";
import { Root as SlotRoot } from "@radix-ui/react-slot";
import { useMemo, useState } from "react";

type Position = {
	x: number;
	y: number;
};

type PositionStore = {
	position: Position;
	setPosition: (position: Position) => void;
};

// Store cache to prevent creating multiple stores for the same ID
const storeCache = new Map<
	string,
	ReturnType<ReturnType<typeof create<PositionStore>>>
>();

export const useAppPositionsStore = (props: {
	id: string;
	defaultPosition?: Position;
}) => {
	if (!storeCache.has(props.id)) {
		const store = create<PositionStore>()(
			persist(
				(set) => ({
					position: props.defaultPosition ?? { x: 0, y: 0 },
					setPosition: (position: Position) => set({ position }),
				}),
				{
					name: `app-positions-${props.id}`,
				},
			),
		);
		storeCache.set(props.id, store);
	}

	// biome-ignore lint/style/noNonNullAssertion: we know the store exists
	return storeCache.get(props.id)!();
};

type Props = React.PropsWithChildren<{
	id: string;
	icon: React.ReactNode;
	appName: string;
	className?: string;
	defaultPosition?: Position;
}>;

export default function AppIcon({
	id,
	icon,
	appName,
	className = "",
	defaultPosition = { x: 0, y: 0 },
	children,
}: Props) {
	const [open, setOpen] = useState(false);
	const { position, setPosition } = useAppPositionsStore({
		id,
		defaultPosition,
	});

	const windowProps = useMemo(
		() => ({
			open,
			onClose: () => setOpen(false),
		}),
		[open],
	);

	return (
		<>
			<motion.button
				drag
				dragMomentum={false}
				dragElastic={0}
				dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
				dragConstraints={{
					top: 10,
					left: 10,
					right: window.innerWidth - 65,
					bottom: window.innerHeight - 120,
				}}
				style={{ x: position.x, y: position.y }}
				onDragEnd={(_, info) => {
					setPosition({
						x: position.x + info.offset.x,
						y: position.y + info.offset.y,
					});
				}}
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
				whileDrag={{ scale: 0.95 }}
				className={cn(
					"absolute cursor-pointer flex items-center justify-center flex-col gap-1.5 select-none",
					className,
				)}
				onDoubleClick={() => setOpen(true)}
				aria-label={`${appName} application icon`}
			>
				<div className="bg-white/20 w-fit h-fit rounded-xl p-2 pointer-events-none">
					{icon}
				</div>
				<span className="text-neutral-900 text-xs font-medium text-center pointer-events-none">
					{appName}
				</span>
			</motion.button>
			{children && (
				<SlotRoot id={id} {...windowProps}>
					{children}
				</SlotRoot>
			)}
		</>
	);
}
