import CellularNetworkIcon from "@/src/components/icons/CellularNetworkIcon";
import WifiIcon from "@/src/components/icons/WifiIcon";
import type { PropsWithChildren } from "react";
import { cn } from "@/src/lib/utils";
import { Laptop } from "lucide-react";
import BatteryStatusView from "./components/BatteryStatusView";

export default function Layout(props: PropsWithChildren) {
	return (
		<div>
			<StatusBar />
			<div className="h-screen">{props.children}</div>
		</div>
	);
}

function StatusBar() {
	const time = new Date().toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<div className="w-full absolute top-0 py-1 bg-gray-50 dark:bg-neutral-900">
			<div className="h-full w-full pt-1 flex justify-between items-center px-8 relative py-1">
				<TimeView className="lg:hidden" time={time} />
				<Laptop className="hidden lg:block text-white" size={16} />
				<div className="flex space-x-2 items-center lg:space-x-4">
					<CellularNetworkIcon className="lg:hidden" />
					<WifiIcon />
					<BatteryStatusView />
					<TimeView className="hidden lg:block" time={time} />
				</div>
			</div>
		</div>
	);
}

function TimeView(props: { className?: string; time: string }) {
	return (
		<time
			className={cn("text-white text-xs font-mono", props.className)}
			dateTime={props.time}
		>
			{props.time}
		</time>
	);
}
