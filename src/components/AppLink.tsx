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
 * `href`-shaped API. Absolute URLs open in a new tab.
 */
export default function AppLink({ href, children, ...props }: AppLinkProps) {
	if (/^https?:\/\//.test(href)) {
		return (
			<a href={href} target="_blank" rel="noreferrer" {...props}>
				{children}
			</a>
		);
	}

	return (
		<RouterLink to={href} {...props}>
			{children}
		</RouterLink>
	);
}
