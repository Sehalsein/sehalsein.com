import type { PropsWithChildren } from "react";

export default function ResumeLayout({ children }: PropsWithChildren) {
	return (
		<div className="flex items-center justify-center p-0 md:p-6 font-mono bg-gray-50 dark:bg-gray-950 min-h-screen print:bg-white">
			<div className="relative flex flex-col gap-16 max-w-4xl bg-white dark:bg-black shadow-lg dark:shadow-none rounded-lg p-8 md:p-12 text-black dark:text-gray-200 border-t-2 border-t-gray-900 dark:border-t-gray-100 dark:border dark:border-gray-800 print:shadow-none print:border-none print:border-t-0 print:bg-white print:p-0">
				{children}
			</div>
		</div>
	);
}
