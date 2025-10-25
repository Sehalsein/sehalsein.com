"use client";

import {
	createContext,
	type PointerEvent,
	type PropsWithChildren,
	useContext,
	useState,
} from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Position = {
	x: number;
	y: number;
};

type WindowPositionStore = {
	position: Position;
	setPosition: (position: Position) => void;
};

// Store cache to prevent creating multiple stores for the same ID
const storeCache = new Map<
	string,
	ReturnType<ReturnType<typeof create<WindowPositionStore>>>
>();

export const useWindowPositionStore = (props: {
	id: string;
	defaultPosition?: Position;
}) => {
	if (!storeCache.has(props.id)) {
		const store = create<WindowPositionStore>()((set) => ({
			position: props.defaultPosition ?? { x: 100, y: 100 },
			setPosition: (position: Position) => set({ position }),
		}));
		storeCache.set(props.id, store);
	}

	// biome-ignore lint/style/noNonNullAssertion: we know the store exists
	return storeCache.get(props.id)!();
};

type DragEvent = PointerEvent<HTMLDivElement> | undefined;

type ContextType = {
	handleClose: () => void;
	handleMinimize: () => void;
	position: Position;
	setPosition: (position: Position) => void;
	dragEvent: DragEvent | null;
	setDragEvent: (dragEvent: DragEvent | null) => void;
};

export const Context = createContext<ContextType>({
	handleClose: () => {},
	handleMinimize: () => {},
	position: { x: 100, y: 100 },
	setPosition: () => {},
	dragEvent: null,
	setDragEvent: () => {},
});

export function useWindowContext() {
	return useContext(Context);
}

export function Provider({
	id,
	children,
	onClose,
	defaultPosition,
}: PropsWithChildren<{
	id: string;
	onClose?: (type: "close" | "minimize") => void;
	defaultPosition?: Position;
}>) {
	const [dragEvent, setDragEvent] = useState<DragEvent | null>(null);
	const { position, setPosition } = useWindowPositionStore({
		id,
		defaultPosition,
	});

	const handleClose = () => {
		onClose?.("close");
		setPosition({ x: 100, y: 100 });
	};

	const handleMinimize = () => {
		onClose?.("minimize");
		setPosition({ x: 100, y: 100 });
	};

	return (
		<Context.Provider
			value={{
				handleClose,
				handleMinimize,
				position,
				setPosition,
				dragEvent,
				setDragEvent,
			}}
		>
			{children}
		</Context.Provider>
	);
}
