"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

export default function HandDrawnUnderline({
	className = "",
}: {
	className?: string;
}) {
	const paths = [
		"M2 7C33.6847 3.42581 65.2676 2.00032 97.0002 2.00005C128.733 1.99978 160.316 4.42533 192.0002 8.00005", // Arc up
		"M2 3C40 8 100 8 198 3", // Arc down
		"M2 5C30 2 80 8 130 5C160 3 180 5 198 6", // S-curve
		"M4 4C40 6 80 3 120 5C160 7 190 4 196 5", // Wavy
	];

	const [selectedPath, setSelectedPath] = useState("");

	useEffect(() => {
		setSelectedPath(paths[Math.floor(Math.random() * paths.length)]);
	}, []);

	if (!selectedPath) {
		return null; // Prevents hydration mismatch by rendering nothing initially
	}

	return (
		<svg
			viewBox="0 0 200 9"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			preserveAspectRatio="none"
		>
			<title>Underline</title>
			<motion.path
				d={selectedPath}
				stroke="currentColor"
				strokeWidth="3"
				strokeLinecap="round"
				vectorEffect="non-scaling-stroke"
				initial={{ pathLength: 0, opacity: 0 }}
				animate={{ pathLength: 1, opacity: 1 }}
				transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
			/>
		</svg>
	);
}
