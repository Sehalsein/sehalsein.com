"use client";

import { motion } from "motion/react";

export default function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-6">
			<motion.h2
				className="text-xl font-bold border-b border-gray-200 dark:border-gray-800 pb-2"
				initial={{ opacity: 0, x: -10 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.3 }}
			>
				{title}
			</motion.h2>
			<div className="flex flex-col">{children}</div>
		</div>
	);
}
