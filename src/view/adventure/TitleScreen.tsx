"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
	listSaves,
	deleteSave,
	newAdventureId,
	avatarUri,
	INK,
	BONE,
	RED,
	GOLD,
	PANEL,
	DIM,
	FAINT,
	PIRATA,
	SERIF,
	type SaveMeta,
} from "./shared";

/* Title-screen drifting embers (left%, size, color, dur s, delay s). */
const TITLE_EMBERS: [string, number, string, number, number][] = [
	["8%", 3, RED, 12, 0],
	["16%", 2, GOLD, 15, 2],
	["24%", 4, "#b5482f", 10, 1],
	["33%", 2, "#8a7a55", 14, 4],
	["42%", 3, GOLD, 11, 3],
	["50%", 2, RED, 16, 6],
	["58%", 4, GOLD, 9, 2],
	["66%", 3, "#b5482f", 13, 5],
	["74%", 2, "#8a7a55", 15, 1],
	["82%", 3, RED, 12, 7],
	["90%", 2, GOLD, 14, 3],
	["12%", 2, GOLD, 13, 8],
	["38%", 3, RED, 17, 9],
	["70%", 2, "#b5482f", 11, 6],
];

const ROOT_STYLE: React.CSSProperties = {
	height: "100dvh",
	display: "flex",
	flexDirection: "column",
	fontFamily: SERIF,
	color: INK,
	background:
		"radial-gradient(circle at 18% 8%, rgba(0,0,0,.03), transparent 42%), radial-gradient(circle at 82% 92%, rgba(0,0,0,.045), transparent 46%), #ece5d6",
	overflow: "hidden",
};

export default function TitleScreen() {
	const router = useRouter();
	const [saves, setSaves] = useState<SaveMeta[]>([]);

	useEffect(() => {
		setSaves(listSaves());
	}, []);

	const startNew = useCallback(() => {
		router.push("/adventure/" + newAdventureId());
	}, [router]);

	const open = useCallback(
		(id: string) => router.push("/adventure/" + id),
		[router],
	);

	const remove = useCallback((id: string) => {
		deleteSave(id);
		setSaves(listSaves());
	}, []);

	return (
		<main className="hr-root" style={ROOT_STYLE}>
			<div
				style={{
					flex: 1,
					position: "relative",
					overflow: "auto",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "48px 40px",
				}}
			>
				{/* drifting embers */}
				<div style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
					{TITLE_EMBERS.map(([left, size, color, dur, delay], i) => (
						<span
							key={i}
							style={{
								position: "absolute",
								left,
								bottom: -8,
								width: size,
								height: size,
								borderRadius: "50%",
								background: color,
								animation: `hr-drift ${dur}s linear ${delay}s infinite`,
							}}
						/>
					))}
				</div>

				<div
					style={{
						position: "relative",
						zIndex: 1,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						textAlign: "center",
						width: "100%",
						maxWidth: 560,
						margin: "auto",
					}}
				>
					{/* d20 emblem */}
					<div
						style={{
							position: "relative",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							marginBottom: 26,
							animation: "hr-rise .7s ease both",
						}}
					>
						<div
							style={{
								position: "absolute",
								width: 240,
								height: 240,
								borderRadius: "50%",
								background:
									"repeating-conic-gradient(rgba(210,59,34,.55) 0deg 1.6deg, transparent 1.6deg 15deg)",
								WebkitMask: "radial-gradient(circle, #000 22%, transparent 64%)",
								mask: "radial-gradient(circle, #000 22%, transparent 64%)",
								animation: "hr-spin 90s linear infinite",
							}}
						/>
						<div
							style={{
								position: "relative",
								width: 92,
								height: 92,
								background: INK,
								color: RED,
								clipPath: "polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontFamily: PIRATA,
								fontSize: 40,
								boxShadow: "0 8px 30px rgba(0,0,0,.25)",
							}}
						>
							20
						</div>
					</div>

					<div
						style={{
							fontSize: 13,
							letterSpacing: ".42em",
							textTransform: "uppercase",
							color: RED,
							fontWeight: 600,
							animation: "hr-rise .7s ease .08s both",
						}}
					>
						A Solo Tabletop Adventure
					</div>
					<h1
						style={{
							fontFamily: PIRATA,
							fontSize: 88,
							lineHeight: 0.9,
							margin: "14px 0 6px",
							color: INK,
							letterSpacing: ".01em",
							animation: "hr-rise .7s ease .16s both",
						}}
					>
						Hollowreach
					</h1>
					<div
						style={{
							width: 140,
							height: 4,
							background: RED,
							margin: "6px 0 22px",
							animation: "hr-rise .7s ease .24s both",
						}}
					/>
					<div
						style={{
							maxWidth: 480,
							fontSize: 19,
							lineHeight: 1.55,
							color: "#473f34",
							fontStyle: "italic",
							animation: "hr-rise .7s ease .3s both",
						}}
					>
						Your story, narrated in real time by an unseen Game Master. Roll the
						dice. Live with what they say.
					</div>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 12,
							marginTop: 18,
							color: INK,
							opacity: 0.45,
							animation: "hr-rise .7s ease .36s both",
						}}
					>
						<div style={{ width: 54, height: 2, background: "currentColor" }} />
						<div
							style={{
								width: 8,
								height: 8,
								background: "currentColor",
								transform: "rotate(45deg)",
							}}
						/>
						<div style={{ width: 54, height: 2, background: "currentColor" }} />
					</div>

					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: 14,
							marginTop: 30,
							width: 300,
							animation: "hr-rise .7s ease .42s both",
						}}
					>
						<button
							type="button"
							className="hr-btn-dark"
							onClick={startNew}
							style={{
								fontFamily: PIRATA,
								fontSize: 22,
								letterSpacing: ".04em",
								padding: 15,
								background: INK,
								color: BONE,
								border: `2px solid ${INK}`,
								cursor: "pointer",
							}}
						>
							Begin a New Adventure
						</button>
					</div>

					{/* saved adventures */}
					{saves.length > 0 && (
						<div
							style={{
								marginTop: 38,
								width: "100%",
								maxWidth: 460,
								animation: "hr-rise .7s ease .5s both",
							}}
						>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: 12,
									marginBottom: 14,
								}}
							>
								<div style={{ flex: 1, height: 2, background: INK, opacity: 0.2 }} />
								<div
									style={{
										fontSize: 11,
										letterSpacing: ".28em",
										textTransform: "uppercase",
										color: DIM,
										fontWeight: 600,
									}}
								>
									Your Tales
								</div>
								<div style={{ flex: 1, height: 2, background: INK, opacity: 0.2 }} />
							</div>
							<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
								{saves.map((sv) => (
									<SaveCard
										key={sv.id}
										save={sv}
										onOpen={() => open(sv.id)}
										onRemove={() => remove(sv.id)}
									/>
								))}
							</div>
						</div>
					)}

					<div
						style={{
							marginTop: 40,
							fontSize: 12,
							letterSpacing: ".18em",
							textTransform: "uppercase",
							color: FAINT,
							animation: "hr-rise .7s ease .56s both",
						}}
					>
						The dice are honest. The Master is not always kind.
					</div>
				</div>
			</div>
		</main>
	);
}

function SaveCard({
	save,
	onOpen,
	onRemove,
}: {
	save: SaveMeta;
	onOpen: () => void;
	onRemove: () => void;
}) {
	const ended = save.status !== "playing";
	const statusLabel =
		save.status === "dead" ? "Fallen" : save.status === "victory" ? "Victory" : null;
	return (
		<div
			role="button"
			tabIndex={0}
			onClick={onOpen}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onOpen();
				}
			}}
			className="hr-save"
			style={{
				display: "flex",
				alignItems: "center",
				gap: 13,
				textAlign: "left",
				padding: "11px 13px",
				border: `2px solid ${INK}`,
				background: PANEL,
				cursor: "pointer",
			}}
		>
			<div
				style={{
					width: 44,
					height: 44,
					flex: "none",
					background: `url('${avatarUri(classOf(save.classLine))}') center/cover no-repeat`,
					border: `1.5px solid ${INK}`,
					borderRadius: "50%",
					opacity: ended ? 0.6 : 1,
				}}
			/>
			<div style={{ minWidth: 0, flex: 1 }}>
				<div
					style={{
						fontFamily: PIRATA,
						fontSize: 19,
						lineHeight: 1.1,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{save.name}
				</div>
				<div
					style={{
						fontSize: 11,
						letterSpacing: ".04em",
						color: DIM,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
						marginTop: 2,
					}}
				>
					{save.classLine}
				</div>
				<div
					style={{
						fontSize: 11.5,
						color: FAINT,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
						marginTop: 2,
					}}
				>
					Turn {save.turn} · {save.location || "An untold place"}
				</div>
			</div>
			{statusLabel && (
				<span
					style={{
						flex: "none",
						fontSize: 9.5,
						letterSpacing: ".12em",
						textTransform: "uppercase",
						fontWeight: 600,
						color: BONE,
						background: save.status === "dead" ? RED : GOLD,
						padding: "3px 7px",
					}}
				>
					{statusLabel}
				</span>
			)}
			<button
				type="button"
				title="Delete this adventure"
				onClick={(e) => {
					e.stopPropagation();
					onRemove();
				}}
				className="hr-save-del"
				style={{
					flex: "none",
					width: 26,
					height: 26,
					display: "grid",
					placeItems: "center",
					fontSize: 15,
					lineHeight: 1,
					background: "transparent",
					border: `1.5px solid ${INK}`,
					color: INK,
					cursor: "pointer",
				}}
			>
				×
			</button>
		</div>
	);
}

// "Level 3 Ranger · Outlander" → "Ranger" (for the medallion).
function classOf(classLine: string): string {
	const m = classLine.match(/Level\s+\d+\s+(\w+)/);
	return m ? m[1] : "Fighter";
}
