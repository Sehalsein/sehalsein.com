"use client";

import { cn } from "@/src/lib/utils";
import { useBrowserContext } from "./Context";
import { match, P } from "ts-pattern";
import { Search } from "lucide-react";
import { useCallback, useState } from "react";

type Props = {
	className?: string;
};

export default function Content(props: Props) {
	const { activeTab } = useBrowserContext();

	return (
		<div className={cn(props.className)}>
			{match(activeTab)
				.with({ page: { url: "browser://newtab" } }, () => (
					<NewTabContent onSearch={(url) => activeTab.push(url)} />
				))
				.with({ page: { url: P.string } }, (tab) => (
					<iframe
						key={`${tab.page.url}-${tab.isLoading ? "loading" : "loaded"}`}
						src={tab.page.url}
						className="w-full h-full border-0"
						onLoad={() => activeTab.setLoading(false)}
						onError={() => activeTab.setLoading(false)}
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

function NewTabContent(props: { onSearch: (url: string) => void }) {
	const [value, setValue] = useState("");

	const onSubmit = useCallback(() => {
		let url = value.trim();

		if (!url.startsWith("http")) {
			url = `https://${url}`;
		}

		props.onSearch(url);
	}, [value, props.onSearch]);

	return (
		<div className="w-full h-full flex items-center justify-center bg-black">
			<div className="w-full flex items-center justify-center lg:max-w-xl bg-white rounded-full px-4 py-1 max-w-xs mx-6">
				<Search className="w-4 h-4 text-neutral-600" />
				<input
					type="text"
					className="w-full h-full p-2 outline-none placeholder:text-neutral-600"
					placeholder="Search"
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							onSubmit();
						}
					}}
				/>
			</div>
		</div>
	);
}
