"use client";

import { cn } from "@/src/lib/utils";
import type { PropsWithChildren } from "react";

type Props = PropsWithChildren & {
	className?: string;
};

export default function Content(props: Props) {
	return (
		<div
			onPointerDown={(e) => e.stopPropagation()}
			className={cn("h-full w-full cursor-default", props.className)}
		>
			{props.children}
		</div>
	);
}
