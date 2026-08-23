import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

export function useAppNavigate() {
	const navigate = useNavigate();

	return useCallback(
		(href: string, replace = false) =>
			navigate({ to: href, replace }),
		[navigate],
	);
}
