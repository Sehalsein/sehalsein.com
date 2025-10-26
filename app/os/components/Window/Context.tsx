"use client";

import {
	createContext,
	type PointerEvent,
	type PropsWithChildren,
	useContext,
	useState,
} from "react";
import { useWindowStore, type Position, INITIAL_WINDOW_STATE } from "./store";

type DragEvent = PointerEvent<HTMLDivElement> | undefined;

type ContextType = {
	handleClose: () => void;
	handleMinimize: () => void;
	position: Position;
	setPosition: (position: Position) => void;
	dragEvent: DragEvent | null;
	setDragEvent: (dragEvent: DragEvent | null) => void;
	setActive: () => void;
};

export const Context = createContext<ContextType>({
	handleClose: () => {},
	handleMinimize: () => {},
	position: INITIAL_WINDOW_STATE.position,
	setPosition: () => {},
	dragEvent: null,
	setDragEvent: () => {},
	setActive: () => {},
});

export function useWindowContext() {
	return useContext(Context);
}

export function Provider({
	id,
	children,
}: PropsWithChildren<{
	id: string;
}>) {
	const [dragEvent, setDragEvent] = useState<DragEvent | null>(null);
	const { state, setPosition, setActive, closeWindow } = useWindowStore({ id });

	const handleClose = () => {
		closeWindow();
	};

	const handleMinimize = () => {
		closeWindow();
	};

	return (
		<Context.Provider
			value={{
				handleClose,
				handleMinimize,
				position: state.position,
				setPosition,
				dragEvent,
				setDragEvent,
				setActive,
			}}
		>
			{state.open && <>{children}</>}
		</Context.Provider>
	);
}
