"use client";

import { motion } from "motion/react";
import HandDrawnUnderline from "./HandDrawnUnderline";

export default function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-6">
			<div className="relative w-fit mb-1">
				<motion.h2
					className="text-xl font-bold"
					initial={{ opacity: 0, x: -10 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.3 }}
				>
					{title}
				</motion.h2>
				<HandDrawnUnderline className="absolute left-0 top-full w-full scale-x-105 opacity-80 h-2" />
			</div>
			<div className="flex flex-col">{children}</div>
		</div>
	);
}
