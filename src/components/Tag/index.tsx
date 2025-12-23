"use client";

import { PropsWithChildren } from "react";

export default function Tag({ children }: PropsWithChildren) {
	return (
		<span className="bg-blue-600 dark:bg-blue-500 px-3 py-1.5 rounded-lg text-sm text-white font-medium print:p-0 print:text-black transition-all duration-200 cursor-default">
			{children}
		</span>
	);
}
