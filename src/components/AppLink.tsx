import { Link as RouterLink } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, PropsWithChildren } from "react";

type AppLinkProps = PropsWithChildren<
	Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
		href: string;
	}
>;

/**
 * Small compatibility wrapper for links shared by the portfolio experiences.
 * Routes remain client-side while individual experiences can keep a plain
 * `href`-shaped API.
 */
export default function AppLink({ href, children, ...props }: AppLinkProps) {
	return (
		<RouterLink to={href} {...props}>
			{children}
		</RouterLink>
	);
}
