"use client";

import {
	createContext,
	type PropsWithChildren,
	useContext,
	useState,
	useCallback,
} from "react";
import type { Tab } from "./type";
import { nanoid } from "nanoid";

type ContextType = {
	tabs: Tab[];
	activeTab: Tab;
	addTab: () => void;
	removeTab: (id: string) => void;
	setActiveTab: (tab: Tab) => void;
};

export const Context = createContext<ContextType>({
	tabs: [],
	activeTab: generateNewTab(),
	addTab: () => {},
	removeTab: () => {},
	setActiveTab: () => {},
});

export function useBrowserContext() {
	return useContext(Context);
}

type Props = PropsWithChildren<{
	tabs?: Tab[];
}>;

export function Provider({ children, tabs: initialTabs = [] }: Props) {
	const [tabs, setTabs] = useState<Tab[]>(
		initialTabs.length > 0 ? initialTabs : [generateNewTab()],
	);
	const [activeTab, setActiveTab] = useState<Tab>(tabs[0]);

	const setActiveTabCallback = useCallback((tab: Tab) => {
		setActiveTab(tab);
	}, []);

	const addNewTab = useCallback(() => {
		const newTab = generateNewTab();
		setTabs((prev) => [...prev, newTab]);
		setActiveTab(newTab);
	}, []);

	const removeTab = useCallback(
		(id: string) => {
			const newActiveTab = tabs.filter((tab) => tab.id !== id);

			if (newActiveTab.length === 0) {
				newActiveTab.push(generateNewTab());
			}

			setTabs(newActiveTab);
			setActiveTab(newActiveTab[newActiveTab.length - 1]);
		},
		[tabs],
	);

	return (
		<Context.Provider
			value={{
				tabs,
				activeTab,
				addTab: addNewTab,
				removeTab,
				setActiveTab: setActiveTabCallback,
			}}
		>
			{children}
		</Context.Provider>
	);
}

function generateNewTab() {
	return {
		id: nanoid(),
		url: "browser://newtab",
		title: "New Tab",
	};
}
