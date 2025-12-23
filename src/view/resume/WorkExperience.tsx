"use client";

import { cn } from "@/src/lib/utils";
import { motion } from "motion/react";
import { CompanyLogo } from "./CompanyLogo";
import { CompanyInfo } from "./CompanyInfo";
import { Duration } from "./Duration";
import type { PropsWithChildren } from "react";

type WorkExperienceProps = {
	company: string;
	logo?: string;
	logoClassName?: string;
	position?: string;
	location?: string;
	duration: {
		from: number;
		to?: number;
	};
	className?: string;
	children?: React.ReactNode;
};

type WorkExperienceRootProps = PropsWithChildren<{
	className?: string;
}>;

function WorkExperienceRoot({ children, className }: WorkExperienceRootProps) {
	return (
		<motion.div
			className={cn(
				"flex flex-col gap-2 py-3 border-b border-transparent transition-colors",
				className,
			)}
			whileHover={{ scale: 1.01 }}
			transition={{ type: "spring", stiffness: 300, damping: 20 }}
		>
			{children}
		</motion.div>
	);
}

type WorkExperienceContentProps = PropsWithChildren<{
	className?: string;
}>;

function WorkExperienceContent({
	children,
	className,
}: WorkExperienceContentProps) {
	return (
		<div className={cn("flex justify-between items-start gap-4", className)}>
			{children}
		</div>
	);
}

type WorkExperienceHeaderProps = PropsWithChildren<{
	className?: string;
}>;

function WorkExperienceHeader({
	children,
	className,
}: WorkExperienceHeaderProps) {
	return (
		<div className={cn("flex items-start gap-3 flex-1", className)}>
			{children}
		</div>
	);
}

export default function WorkExperience({
	company,
	logo,
	logoClassName,
	position,
	location,
	duration: { to, from },
	className,
	children,
}: WorkExperienceProps) {
	return (
		<WorkExperienceRoot className={className}>
			<WorkExperienceContent>
				<WorkExperienceHeader>
					{logo && (
						<CompanyLogo
							logo={logo}
							company={company}
							className={logoClassName}
						/>
					)}
					<CompanyInfo
						company={company}
						position={position}
						location={location}
					/>
				</WorkExperienceHeader>
				<Duration from={from} to={to} />
			</WorkExperienceContent>
			{children}
		</WorkExperienceRoot>
	);
}

// Export sub-components for composition
WorkExperience.Root = WorkExperienceRoot;
WorkExperience.Content = WorkExperienceContent;
WorkExperience.Header = WorkExperienceHeader;
WorkExperience.Logo = CompanyLogo;
WorkExperience.Info = CompanyInfo;
WorkExperience.Duration = Duration;
