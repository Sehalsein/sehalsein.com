"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import type { PropsWithChildren } from "react";
import { PALETTE_NAMES } from "@/src/data/terminal";

export default function ThemeProvider({ children }: PropsWithChildren) {
	return (
		<NextThemeProvider
			attribute="data-palette"
			defaultTheme="default"
			themes={[...PALETTE_NAMES]}
			storageKey="terminal-palette"
			disableTransitionOnChange
			enableSystem={false}
			enableColorScheme={false}
		>
			{children}
		</NextThemeProvider>
	);
}
