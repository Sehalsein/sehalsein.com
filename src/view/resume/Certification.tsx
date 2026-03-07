"use client";

import { cn } from "@/src/lib/utils";
import type { PropsWithChildren } from "react";

type CertificationRootProps = PropsWithChildren<{
	className?: string;
}>;

function CertificationRoot({ children, className }: CertificationRootProps) {
	return (
		<div
			className={cn(
				"flex flex-col gap-2 py-2 rounded-lg px-3 -mx-3 transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-900/40 hover:translate-x-1",
				className,
			)}
		>
			{children}
		</div>
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
		<span
			className={cn(
				"inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap",
				className,
			)}
		>
			{issued}
		</span>
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
