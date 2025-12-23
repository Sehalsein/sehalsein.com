"use client";

import { cn } from "@/src/lib/utils";
import { motion } from "motion/react";
import type { PropsWithChildren } from "react";

type CertificationRootProps = PropsWithChildren<{
	className?: string;
}>;

function CertificationRoot({ children, className }: CertificationRootProps) {
	return (
		<motion.div
			className={cn(
				"flex flex-col gap-2 py-2 border-b border-transparent transition-colors",
				className,
			)}
			whileHover={{ scale: 1.01 }}
			transition={{ type: "spring", stiffness: 300, damping: 20 }}
		>
			{children}
		</motion.div>
	);
}

type CertificationContentProps = PropsWithChildren<{
	className?: string;
}>;

function CertificationContent({
	children,
	className,
}: CertificationContentProps) {
	return (
		<div className={cn("flex justify-between items-start gap-4", className)}>
			{children}
		</div>
	);
}

type CertificationHeaderProps = PropsWithChildren<{
	className?: string;
}>;

function CertificationHeader({
	children,
	className,
}: CertificationHeaderProps) {
	return <div className={cn("flex flex-col gap-1", className)}>{children}</div>;
}

type CertificationNameProps = {
	name: string;
	className?: string;
};

function CertificationName({ name, className }: CertificationNameProps) {
	return <h3 className={cn("text-lg font-bold", className)}>{name}</h3>;
}

type CertificationIssuerProps = {
	issuer: string;
	className?: string;
};

function CertificationIssuer({ issuer, className }: CertificationIssuerProps) {
	return (
		<p
			className={cn(
				"text-sm font-medium text-gray-500 dark:text-gray-400",
				className,
			)}
		>
			{issuer}
		</p>
	);
}

type CertificationIssuedProps = {
	issued: string;
	className?: string;
};

function CertificationIssued({ issued, className }: CertificationIssuedProps) {
	return (
		<p
			className={cn(
				"text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap",
				className,
			)}
		>
			{issued}
		</p>
	);
}

// Export sub-components for composition
const Certification = {
	Root: CertificationRoot,
	Content: CertificationContent,
	Header: CertificationHeader,
	Name: CertificationName,
	Issuer: CertificationIssuer,
	Issued: CertificationIssued,
};

export default Certification;
