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
};

function RootContent(props: Props) {
	const dragControls = useDragControls();
	const { position, setPosition, dragEvent, setActive } = useWindowContext();

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
		<motion.div
			dragControls={dragControls}
			className={cn(
				"absolute rounded-lg overflow-hidden flex flex-col shadow-2xl border border-neutral-800",
				props.className,
			)}
			style={{
				x: position.x,
				y: position.y,
				zIndex: position.z,
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
			onDragStart={() => setActive()}
			onDragEnd={(_, info) => {
				setPosition({
					x: position.x + info.offset.x,
					y: position.y + info.offset.y,
					z: position.z,
				});
				setActive();
			}}
			onClick={setActive}
			aria-label={`${props.id} window`}
		>
			{props.children}
		</motion.div>
	);
}

export default function Root(props: Props) {
	return (
		<Provider id={props.id}>
			<AnimatePresence>
				<RootContent {...props} />
			</AnimatePresence>
		</Provider>
	);
}
