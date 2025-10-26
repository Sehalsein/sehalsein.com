"use client";

import {
	createContext,
	type PropsWithChildren,
	useContext,
	useState,
	useCallback,
	useMemo,
} from "react";
import type { BaseTab, Tab, TabActions } from "./type";
import { nanoid } from "nanoid";

type ContextType = {
	tabs: Tab[];
	activeTab: Tab & TabActions;
	addTab: () => void;
	removeTab: (id: string) => void;
	setActiveTab: (tab: Tab) => void;
};

export const Context = createContext<ContextType>({
	tabs: [],
	activeTab: {
		...generateNewTab(),
		refresh: () => {},
		home: () => {},
		push: () => {},
		setLoading: () => {},
	},
	addTab: () => {},
	removeTab: () => {},
	setActiveTab: () => {},
});

export function useBrowserContext() {
	return useContext(Context);
}

type Props = PropsWithChildren<{
	tabs?: BaseTab[];
}>;

export function Provider({ children, tabs: initialTabs = [] }: Props) {
	const [tabs, setTabs] = useState<Tab[]>(
		initialTabs.length > 0
			? initialTabs.map((e) => ({
					...e,
					isLoading: false,
					history: [e.page],
				}))
			: [generateNewTab()],
	);
	const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);

	// Memoize active tab to avoid unnecessary re-renders
	const activeTab = useMemo(
		() => tabs.find((tab) => tab.id === activeTabId) || tabs[0],
		[tabs, activeTabId],
	);

	// Memoize history state
	const { currentIndex, history } = useMemo(() => {
		const tab = activeTab;
		if (!tab?.history || tab.history.length === 0) {
			return { currentIndex: -1, history: [] };
		}
		const pageIndex = tab.history.findIndex((h) => h.id === tab.page.id);
		return {
			currentIndex: pageIndex,
			history: tab.history,
		};
	}, [activeTab]);

	const canGoBack = useMemo(
		() => currentIndex > 0 && history.length > 1,
		[currentIndex, history.length],
	);

	const canGoForward = useMemo(
		() => currentIndex < history.length - 1 && history.length > 1,
		[currentIndex, history.length],
	);

	const setActiveTabCallback = useCallback((tab: Tab) => {
		setActiveTabId(tab.id);
	}, []);

	const addNewTab = useCallback(() => {
		const newTab = generateNewTab();
		setTabs((prev) => [...prev, newTab]);
		setActiveTabId(newTab.id);
	}, []);

	const removeTab = useCallback(
		(id: string) => {
			setTabs((prev) => {
				const filtered = prev.filter((tab) => tab.id !== id);

				// If we're removing the active tab, switch to another
				if (id === activeTabId) {
					const currentIndex = prev.findIndex((tab) => tab.id === id);
					const newActiveIndex = Math.min(
						currentIndex,
						Math.max(0, filtered.length - 1),
					);
					setActiveTabId(filtered[newActiveIndex]?.id || filtered[0]?.id);
				}

				// If no tabs left, create a new one
				if (filtered.length === 0) {
					const newTab = generateNewTab();
					setActiveTabId(newTab.id);
					return [newTab];
				}

				return filtered;
			});
		},
		[activeTabId],
	);

	const navigateTo = useCallback(
		(url: string, options?: { newTab?: boolean }) => {
			const newPage = { url, title: url, id: nanoid() };

			// If newTab option is true, create a new tab with this URL
			if (options?.newTab) {
				const newTab = generateNewTab(url);
				setTabs((prev) => [...prev, newTab]);
				setActiveTabId(newTab.id);
				return;
			}

			// Otherwise, navigate in the current active tab
			const tab = activeTab;
			if (!tab) return;

			const history = tab.history || [];

			// Find current page index in history
			const currentIndex = history.findIndex((h) => h.id === tab.page.id);

			// Remove any forward history when navigating to a new URL
			const newHistory =
				currentIndex >= 0 && currentIndex < history.length - 1
					? history.slice(0, currentIndex + 1)
					: [...history];

			// Add new page to history
			newHistory.push(newPage);

			// Limit history to last 50 entries
			const finalHistory = newHistory.slice(-50);

			setTabs((prev) =>
				prev.map((t) =>
					t.id === tab.id
						? {
								...t,
								page: newPage,
								history: finalHistory,
								isLoading: true,
							}
						: t,
				),
			);
		},
		[activeTab],
	);

	const goBack = useCallback((tabId: string) => {
		setTabs((prev) =>
			prev.map((tab) => {
				if (tab.id !== tabId || !tab.history || tab.history.length <= 1)
					return tab;

				const currentIndex = tab.history.findIndex((h) => h.id === tab.page.id);

				if (currentIndex <= 0) return tab;

				const previousPage = tab.history[currentIndex - 1];
				return {
					...tab,
					page: previousPage,
					isLoading: true,
				};
			}),
		);
	}, []);

	const goForward = useCallback((tabId: string) => {
		setTabs((prev) =>
			prev.map((tab) => {
				if (tab.id !== tabId || !tab.history || tab.history.length <= 1)
					return tab;

				const currentIndex = tab.history.findIndex((h) => h.id === tab.page.id);

				if (currentIndex === -1 || currentIndex >= tab.history.length - 1) {
					return tab;
				}

				const nextPage = tab.history[currentIndex + 1];
				return {
					...tab,
					page: nextPage,
					isLoading: true,
				};
			}),
		);
	}, []);

	const setLoading = useCallback((tabId: string, loading: boolean) => {
		setTabs((prev) =>
			prev.map((tab) =>
				tab.id === tabId
					? {
							...tab,
							isLoading: loading,
						}
					: tab,
			),
		);
	}, []);

	const contextValue = useMemo<ContextType>(
		() => ({
			tabs,
			activeTab: {
				...activeTab,
				goBack: canGoBack ? () => goBack(activeTab.id) : undefined,
				goForward: canGoForward ? () => goForward(activeTab.id) : undefined,
				refresh: () => {
					setLoading(activeTab.id, true);
					setTimeout(() => {
						setLoading(activeTab.id, false);
					}, 1000);
				},
				home: () => navigateTo("browser://newtab"),
				push: (url, options) => navigateTo(url, options),
				setLoading: (loading: boolean) => setLoading(activeTab.id, loading),
			},
			addTab: addNewTab,
			removeTab,
			setActiveTab: setActiveTabCallback,
		}),
		[
			tabs,
			activeTab,
			addNewTab,
			removeTab,
			setActiveTabCallback,
			navigateTo,
			goBack,
			goForward,
			canGoBack,
			canGoForward,
			setLoading,
		],
	);

	return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}

function generateNewTab(url?: string): Tab {
	const page = url
		? { id: nanoid(), url, title: url }
		: { id: nanoid(), url: "browser://newtab", title: "New Tab" };

	return {
		id: nanoid(),
		isLoading: false,
		history: [page], // Initialize history with the initial page
		page,
	};
}
