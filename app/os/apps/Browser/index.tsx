import Window from "../../components/Window";
import Content from "./Content";
import { Provider } from "./Context";
import TabBar from "./TabBar";
import type { Tab } from "./type";

type Props = Partial<React.ComponentProps<typeof Window.Root>> & {
	initialTabs?: Tab[];
};

export default function Browser({ initialTabs, ...rest }: Props) {
	console.log("initialTabs", initialTabs);
	return (
		<Window.Root
			className="absolute top-20 left-1/3 w-1/2 h-3/4"
			id="browser"
			{...rest}
		>
			<Provider tabs={initialTabs}>
				<TabBar />
				<Window.Content>
					<Content className="h-full w-full bg-stone-300" />
				</Window.Content>
			</Provider>
		</Window.Root>
	);
}
