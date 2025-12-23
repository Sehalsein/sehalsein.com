import type { PropsWithChildren } from "react";

export default function ResumeLayout({ children }: PropsWithChildren) {
	return (
		<div className="flex items-center justify-center p-0 md:p-6 font-mono">
			<div className="flex flex-col gap-12 max-w-3xl bg-white dark:bg-black shadow-xs rounded-lg px-8 py-10 text-black dark:text-gray-200">
				{children}
			</div>
		</div>
	);
}
