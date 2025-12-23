"use client";

import { Github, Linkedin, Mail, Smartphone } from "lucide-react";
import NextLink from "next/link";
import Image from "next/image";
import type { PropsWithChildren } from "react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

type ProfileRootProps = PropsWithChildren<{
	className?: string;
}>;

function ProfileRoot({ children, className }: ProfileRootProps) {
	return <div className={cn("flex flex-col gap-4", className)}>{children}</div>;
}

type ProfileHeaderProps = PropsWithChildren<{
	className?: string;
}>;

function ProfileHeader({ children, className }: ProfileHeaderProps) {
	return (
		<div
			className={cn(
				"flex flex-col sm:flex-row gap-4 items-start sm:items-center",
				className,
			)}
		>
			{children}
		</div>
	);
}

type ProfileContentProps = PropsWithChildren<{
	className?: string;
}>;

function ProfileContent({ children, className }: ProfileContentProps) {
	return (
		<div className={cn("flex flex-col gap-2 flex-1", className)}>
			{children}
		</div>
	);
}

type ProfilePhotoProps = {
	photo: string;
	className?: string;
};

function ProfilePhoto({ photo, className }: ProfilePhotoProps) {
	return (
		<motion.div
			className={cn("shrink-0", className)}
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.5 }}
		>
			<Image
				src={photo}
				alt="Profile photo"
				width={80}
				height={80}
				className="rounded-full w-20 h-20 object-cover border-2 border-gray-200 dark:border-gray-800"
			/>
		</motion.div>
	);
}

type ProfileNameProps = {
	name: string;
	className?: string;
};

function ProfileName({ name, className }: ProfileNameProps) {
	return (
		<motion.h1
			className={cn(
				"text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100",
				className,
			)}
			initial={{ opacity: 0, y: -10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
		>
			{name}
		</motion.h1>
	);
}

type ProfileContactInfoProps = PropsWithChildren<{
	className?: string;
}>;

function ProfileContactInfo({ children, className }: ProfileContactInfoProps) {
	return (
		<div className={cn("flex flex-wrap items-center gap-3", className)}>
			{children}
		</div>
	);
}

type ProfileEmailProps = {
	email: string;
	className?: string;
};

function ProfileEmail({ email, className }: ProfileEmailProps) {
	return (
		<motion.div
			className={className}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ delay: 0.2 }}
		>
			<Link href={`mailto:${email}`}>
				<div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
					<Mail className="w-4 h-4" />
					<span className="text-sm">{email}</span>
				</div>
			</Link>
		</motion.div>
	);
}

type ProfilePhoneProps = {
	phone: string;
	className?: string;
};

function ProfilePhone({ phone, className }: ProfilePhoneProps) {
	return (
		<motion.div
			className={className}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ delay: 0.25 }}
		>
			<Link href={`tel:${phone}`}>
				<div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
					<Smartphone className="w-4 h-4" />
					<span className="text-sm">{phone}</span>
				</div>
			</Link>
		</motion.div>
	);
}

type ProfileSocialLinksProps = {
	social: {
		name: string;
		url: string;
	}[];
	className?: string;
};

function ProfileSocialLinks({ social, className }: ProfileSocialLinksProps) {
	return (
		<>
			{social.map((s, index) => (
				<motion.div
					key={s.name}
					className={className}
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.3 + index * 0.05 }}
				>
					<Link href={s.url}>{getSocialIcon(s.name)}</Link>
				</motion.div>
			))}
		</>
	);
}

type ProfileSummaryProps = {
	summary: string;
	className?: string;
};

function ProfileSummary({ summary, className }: ProfileSummaryProps) {
	return (
		<motion.p
			className={cn(
				"text-sm text-gray-600 dark:text-gray-400 leading-relaxed",
				className,
			)}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ delay: 0.4 }}
		>
			{summary}
		</motion.p>
	);
}

function Link({ children, href }: PropsWithChildren<{ href: string }>) {
	return (
		<NextLink target="_blank" href={href} className="hover:underline text-sm">
			{children}
		</NextLink>
	);
}

function getSocialIcon(name: string) {
	switch (name.toLowerCase()) {
		case "linkedin":
			return (
				<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
					<Linkedin className="h-6 w-6 hover:text-blue-600 dark:hover:text-blue-400 rounded-sm p-1 transition-colors" />
				</motion.div>
			);
		case "github":
			return (
				<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
					<Github className="h-6 w-6 hover:text-gray-900 dark:hover:text-gray-100 rounded-sm p-1 transition-colors" />
				</motion.div>
			);
		default:
			return null;
	}
}

// Export sub-components for composition
const Profile = {
	Root: ProfileRoot,
	Header: ProfileHeader,
	Content: ProfileContent,
	Photo: ProfilePhoto,
	Name: ProfileName,
	ContactInfo: ProfileContactInfo,
	Email: ProfileEmail,
	Phone: ProfilePhone,
	SocialLinks: ProfileSocialLinks,
	Summary: ProfileSummary,
};

export default Profile;
