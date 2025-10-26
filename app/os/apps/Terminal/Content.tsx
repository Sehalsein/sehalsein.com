"use client";

import { cn } from "@/src/lib/utils";
import React, { useEffect, useState, useRef } from "react";

type Props = {
	className?: string;
};

export default function Content(props: Props) {
	const [command, setCommand] = useState<string[]>([]);
	const [showInput, setShowInput] = useState<boolean>(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		setCommand([`Last login: ${new Date().toLocaleTimeString()} on ttys009`]);

		setTimeout(() => {
			setShowInput(true);
		}, 400);
	}, []);

	const handleContainerClick = () => {
		if (inputRef.current) {
			inputRef.current.focus();
		}
	};

	return (
		<div
			className={cn(
				"bg-black flex flex-col text-green-500 font-mono px-2 py-1",
				props.className,
			)}
		>
			<button
				className="w-full h-full text-left cursor-text focus:outline-none flex flex-col"
				onClick={handleContainerClick}
				type="button"
			>
				<div>
					{command.map((cmd, index) => (
						<div key={`cmd-${Date.now()}-${index}-${cmd.slice(0, 10)}`}>
							<p>{cmd}</p>
						</div>
					))}
				</div>
				{showInput && (
					<TerminalInput
						ref={inputRef}
						onSubmit={(value) => {
							setCommand([
								...command,
								value,
								`zsh: command not found: ${value}`,
							]);
						}}
						username="sehalsein"
						hostname="Mac"
						path="~"
					/>
				)}
			</button>
		</div>
	);
}

type TerminalInputProps = {
	onSubmit: (value: string) => void;
	username: string;
	hostname: string;
	path: string;
};

const TerminalInput = React.forwardRef<HTMLInputElement, TerminalInputProps>(
	(props, ref) => {
		const [value, setValue] = useState<string>("");

		return (
			<div className="flex items-center gap-2">
				<p className="shrink-0">
					{props.username}@{props.hostname} {props.path} %
				</p>
				<input
					ref={ref}
					type="text"
					className="w-full ring-0 outline-none"
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							props.onSubmit(value);
							setValue("");
						}
					}}
				/>
			</div>
		);
	},
);
TerminalInput.displayName = "TerminalInput";
