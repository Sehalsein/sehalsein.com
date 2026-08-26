"use client";

import { BriefcaseBusiness, FileText, Folder, UserRound } from "lucide-react";
import type { AppId } from "../apps/registry";

type Props = {
	onOpen: (appId: AppId) => void;
};

const DESKTOP_ITEMS = [
	{
		appId: "about" as const,
		label: "About Sehal",
		meta: "Profile",
		icon: UserRound,
		accent: "blue",
	},
	{
		appId: "finder" as const,
		label: "Projects",
		meta: "7 items",
		icon: Folder,
		accent: "amber",
	},
	{
		appId: "xp" as const,
		label: "Experience",
		meta: "Timeline",
		icon: BriefcaseBusiness,
		accent: "violet",
	},
	{
		appId: "notes" as const,
		label: "Notes",
		meta: "3 files",
		icon: FileText,
		accent: "mint",
	},
];

export default function Desktop({ onOpen }: Props) {
	return (
		<>
			<div className="wallgrid" />
			<div className="wallmark" aria-hidden="true">sehal</div>

			<div className="desktop-signature">
				<span>Sehal&apos;s workspace</span>
				<strong>Build things that matter.</strong>
				<p>Engineering · products · experiments</p>
			</div>

			<div className="desktop-files" aria-label="Desktop shortcuts">
				{DESKTOP_ITEMS.map(({ appId, label, meta, icon: Icon, accent }) => (
					<button
						type="button"
						key={appId}
						className="desktop-file"
						onClick={() => onOpen(appId)}
						aria-label={`Open ${label}`}
					>
						<span className={`desktop-file-icon ${accent}`}>
							<Icon aria-hidden="true" />
						</span>
						<span className="desktop-file-copy">
							<strong>{label}</strong>
							<small>{meta}</small>
						</span>
					</button>
				))}
			</div>
		</>
	);
}
