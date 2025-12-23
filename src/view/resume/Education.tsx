"use client";

import { cn } from "@/src/lib/utils";
import { motion } from "motion/react";
import { Duration } from "./Duration";
import type { PropsWithChildren } from "react";

type EducationRootProps = PropsWithChildren<{
	className?: string;
}>;

function EducationRoot({ children, className }: EducationRootProps) {
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

type EducationContentProps = PropsWithChildren<{
	className?: string;
}>;

function EducationContent({ children, className }: EducationContentProps) {
	return (
		<div className={cn("flex justify-between items-start gap-4", className)}>
			{children}
		</div>
	);
}

type EducationHeaderProps = PropsWithChildren<{
	className?: string;
}>;

function EducationHeader({ children, className }: EducationHeaderProps) {
	return <div className={cn("flex flex-col gap-1", className)}>{children}</div>;
}

type EducationNameProps = {
	name: string;
	className?: string;
};

function EducationName({ name, className }: EducationNameProps) {
	return <h3 className={cn("text-lg font-bold", className)}>{name}</h3>;
}

type EducationInstitutionProps = {
	institution: string;
	location?: string;
	className?: string;
};

function EducationInstitution({
	institution,
	location,
	className,
}: EducationInstitutionProps) {
	return (
		<p
			className={cn(
				"text-sm font-medium text-gray-500 dark:text-gray-400",
				className,
			)}
		>
			{institution} {location && `• ${location}`}
		</p>
	);
}

// Export sub-components for composition
const Education = {
	Root: EducationRoot,
	Content: EducationContent,
	Header: EducationHeader,
	Name: EducationName,
	Institution: EducationInstitution,
	Duration: Duration,
};

export default Education;
