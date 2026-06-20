"use client";

import { Streamdown } from "streamdown";
import "streamdown/styles.css";

type Props = {
	children: string;
	className?: string;
	/** While true, Streamdown runs in streaming mode and shows its built-in
	 *  caret trailing the text. */
	streaming?: boolean;
};

/**
 * Thin wrapper around Streamdown (streamdown.ai) for rendering streaming
 * markdown prose. Streamdown tolerates incomplete markdown mid-stream and
 * renders its own caret (the "block" style) that follows the last token while
 * `streaming` is set, so we don't append a cursor manually.
 *
 * Font/color is inherited from the wrapping element — pass `className` to theme
 * it (serif for the adventure narration, mono for the terminal chat).
 */
export default function Markdown({ children, className, streaming }: Props) {
	return (
		<Streamdown
			className={className}
			mode={streaming ? "streaming" : "static"}
			caret="block"
			parseIncompleteMarkdown
		>
			{children}
		</Streamdown>
	);
}
