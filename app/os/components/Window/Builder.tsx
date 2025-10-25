import Root from "./Root";
import ActionBar from "./ActionBar";
import Content from "./Content";

export default function Builder() {
	return (
		<Root className="absolute top-10 left-10 w-1/2 h-3/4">
			<ActionBar title="Code Editor" />
			<Content>
				<div className="h-full w-full bg-stone-300">asd</div>
			</Content>
		</Root>
	);
}
