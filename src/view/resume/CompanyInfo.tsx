"use client";

import { cn } from "@/src/lib/utils";

type CompanyInfoProps = {
	company: string;
	position?: string;
	location?: string;
	className?: string;
};

export function CompanyInfo({
	company,
	position,
	location,
	className,
}: CompanyInfoProps) {
	return (
		<div className={cn("flex flex-col gap-1 flex-1", className)}>
			<h3 className="text-lg font-bold">{company}</h3>
			{(position || location) && (
				<p className="text-sm font-medium text-gray-500 dark:text-gray-400">
					{position} {location && `• ${location}`}
				</p>
			)}
		</div>
	);
}

