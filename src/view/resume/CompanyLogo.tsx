"use client";

import { cn } from "@/src/lib/utils";
import { motion } from "motion/react";
import Image from "next/image";

type CompanyLogoProps = {
	logo: string;
	company: string;
	className?: string;
};

export function CompanyLogo({ logo, company, className }: CompanyLogoProps) {
	return (
		<motion.div
			className={cn(
				"relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md",
				className,
			)}
			initial={{ opacity: 0, scale: 0.8 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.3 }}
		>
			<div className="w-full h-full relative">
				<Image
					src={logo}
					alt={`${company} logo`}
					fill
					className="object-contain"
					sizes="56px"
				/>
			</div>
		</motion.div>
	);
}
