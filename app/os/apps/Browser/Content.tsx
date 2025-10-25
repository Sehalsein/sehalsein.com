"use client";

import { cn } from "@/src/lib/utils";
import { useBrowserContext } from "./Context";
import { match, P } from "ts-pattern";

type Props = {
	className?: string;
};

export default function Content(props: Props) {
	const { activeTab } = useBrowserContext();

	return (
		<div className={cn(props.className)}>
			{match(activeTab)
				.with({ url: "browser://newtab" }, () => (
					<div className="w-full h-full flex items-center justify-center">
						<p className="text-sm text-stone-100">New Tab</p>
					</div>
				))
				.with({ url: P.string }, (tab) => (
					<iframe
						src={tab.url}
						className="w-full h-full border-0"
						// onLoad={() => setIsLoading(false)}
						sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
						title="Mini Browser Content"
					/>
				))
				.otherwise(() => (
					<span>Not found</span>
				))}
		</div>
	);
}
