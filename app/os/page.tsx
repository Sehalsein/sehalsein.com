import { Globe, Terminal } from "lucide-react";
import AppIcon from "./components/AppIcon";
import Browser from "./apps/Browser";
import TerminalApp from "./apps/Terminal";

export default function Page() {
	return <DesktopView />;
}

function DesktopView() {
	return (
		<div
			className="h-screen w-screen pt-8"
			style={{
				backgroundImage: `url("https://res.cloudinary.com/dmukukwp6/image/upload/carpet_light_27d74f73b5.png")`,
				backgroundSize: "200px 198px",
				backgroundRepeat: "repeat",
			}}
		>
			<AppIcon
				id="browser"
				icon={<Globe />}
				appName="browser"
				defaultPosition={{ x: 10, y: 10 }}
			>
				<Browser />
			</AppIcon>
			<AppIcon
				id="terminal"
				icon={<Terminal />}
				appName="terminal"
				defaultPosition={{ x: 10, y: 90 }}
			>
				<TerminalApp />
			</AppIcon>
		</div>
	);
}
