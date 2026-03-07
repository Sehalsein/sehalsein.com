"use client";

import { cn } from "@/src/lib/utils";

type DurationProps = {
	from: number;
	to?: number;
	className?: string;
};

export function Duration({ from, to, className }: DurationProps) {
	return (
		<div className={cn("flex flex-col", className)}>
			<span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
				{!to && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
				{from} - {to || "Present"}
			</span>
		</div>
	);
}

