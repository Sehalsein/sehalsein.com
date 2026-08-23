import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	PALETTE_NAMES,
	type PaletteName,
} from "@/src/data/terminal";

const STORAGE_KEY = "terminal-palette";

type PaletteContextValue = {
	theme: PaletteName;
	setTheme: (theme: PaletteName) => void;
};

const PaletteContext = createContext<PaletteContextValue | null>(null);

function isPalette(value: string | null): value is PaletteName {
	return !!value && PALETTE_NAMES.includes(value as PaletteName);
}

export default function ThemeProvider({ children }: PropsWithChildren) {
	const [theme, setThemeState] = useState<PaletteName>("default");
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (isPalette(stored)) setThemeState(stored);
		setHydrated(true);
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		document.documentElement.dataset.palette = theme;
		window.localStorage.setItem(STORAGE_KEY, theme);
	}, [hydrated, theme]);

	const setTheme = useCallback((next: PaletteName) => setThemeState(next), []);
	const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

	return (
		<PaletteContext.Provider value={value}>
			{children}
		</PaletteContext.Provider>
	);
}

export function usePalette() {
	const value = useContext(PaletteContext);
	if (!value) throw new Error("usePalette must be used inside ThemeProvider");
	return value;
}
