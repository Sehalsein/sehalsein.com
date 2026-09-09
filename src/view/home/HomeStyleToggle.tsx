export type HomeLayout = "readme" | "sketch" | "studio";

type HomeStyleToggleProps = {
	layout: HomeLayout;
	onChange: (layout: HomeLayout) => void;
	tone: "clean" | "sketch" | "studio";
};

export default function HomeStyleToggle({
	layout,
	onChange,
	tone,
}: HomeStyleToggleProps) {
	return (
		<div
			className={`home-style-toggle home-style-toggle--${tone}`}
			role="group"
			aria-label="Choose homepage style"
		>
			<span aria-hidden="true">view</span>
			<button
				type="button"
				aria-pressed={layout === "readme"}
				onClick={() => onChange("readme")}
			>
				clean
			</button>
			<button
				type="button"
				aria-pressed={layout === "sketch"}
				onClick={() => onChange("sketch")}
			>
				sketchbook
			</button>
			<button
				type="button"
				aria-pressed={layout === "studio"}
				onClick={() => onChange("studio")}
			>
				studio
			</button>
		</div>
	);
}
