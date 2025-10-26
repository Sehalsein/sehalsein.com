import Window from "../../components/Window";
import Content from "./Content";

export default function Terminal() {
	return (
		<Window.Root className="absolute top-40 left-80 w-1/2 h-3/4" id="terminal">
			<Window.ActionBar title="Terminal" />
			<Window.Content>
				<Content className="h-full w-full" />
			</Window.Content>
		</Window.Root>
	);
}
