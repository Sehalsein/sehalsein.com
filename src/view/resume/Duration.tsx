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
			<p className="text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
				{from} - {to || "Present"}
			</p>
		</div>
	);
}

