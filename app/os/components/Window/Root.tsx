"use client";

import { cn } from "@/src/lib/utils";
import { AnimatePresence, useDragControls } from "motion/react";
import type { PropsWithChildren } from "react";
import { Provider, useWindowContext } from "./Context";
import { motion } from "motion/react";
import { useEffect } from "react";

type Props = PropsWithChildren & {
	className?: string;
	id: string;
	open?: boolean;
	onClose?: (type: "close" | "minimize") => void;
};

function RootContent(props: Props) {
	const dragControls = useDragControls();
	const { position, setPosition, dragEvent } = useWindowContext();

	useEffect(() => {
		if (!dragEvent) {
			dragControls?.stop();
			return;
		}

		dragControls?.start(dragEvent);

		return () => {
			dragControls?.stop();
		};
	}, [dragEvent, dragControls]);

	return (
		<AnimatePresence>
			<motion.div
				dragControls={dragControls}
				className={cn(
					"absolute rounded-lg overflow-hidden flex flex-col",
					props.className,
				)}
				style={{
					x: position.x,
					y: position.y,
					// width: size.width,
					// height: size.height,
				}}
				drag
				dragMomentum={false}
				dragElastic={0}
				dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
				// dragConstraints={{
				// 	top: 10,
				// 	left: 10,
				// 	right: window.innerWidth - 65,
				// 	bottom: window.innerHeight - 120,
				// }}
				dragListener={false}
				onDragEnd={(_, info) => {
					setPosition({
						x: position.x + info.offset.x,
						y: position.y + info.offset.y,
					});
				}}
				aria-label={`${props.id} window`}
			>
				{props.children}
			</motion.div>
		</AnimatePresence>
	);
}

export default function Root(props: Props) {
	const { open } = props;

	if (!open) return null;

	return (
		<Provider onClose={props.onClose} id={props.id}>
			<RootContent {...props} />
		</Provider>
	);
}
