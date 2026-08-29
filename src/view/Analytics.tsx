import { useEffect } from "react";

export default function Analytics() {
	useEffect(() => {
		const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
		if (!key) return;

		const initialise = () => {
			void import("posthog-js").then(({ default: posthog }) => {
				posthog.init(key, {
					api_host: "/ingest",
					ui_host: "https://us.posthog.com",
					defaults: "2025-05-24",
					capture_exceptions: true,
					disable_compression: true,
					debug: import.meta.env.DEV,
				});
			});
		};

		window.setTimeout(initialise, 600);
	}, []);

	return null;
}
