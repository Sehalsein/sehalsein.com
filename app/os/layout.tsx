import BatteryIcon from "@/src/components/icons/BatteryIcon";
import CellularNetworkIcon from "@/src/components/icons/CellularNetworkIcon";
import MessageIcon from "@/src/components/icons/MessageIcon";
import PhoneAppIcon from "@/src/components/icons/PhoneAppIcon";
import SafariIcon from "@/src/components/icons/SafariIcon";
import WifiIcon from "@/src/components/icons/WifiIcon";
import { PropsWithChildren } from "react";
import AppIcon from "./components/AppIcon";
import MailIcon from "@/src/components/icons/MailIcon";
import { cn } from "@/src/lib/utils";
import { RESUME_DATA } from "@/src/data/resume";
import {
  Dock as DockRoot,
  DockIcon,
  DockItem,
  DockLabel,
} from "./components/Dock";
import { Mail, PhoneIcon, LucideFileBadge2, Laptop } from "lucide-react";
import Link from "next/link";
// import EasterEgg from "./components/EasterEgg";

export default function Layout(props: PropsWithChildren) {
  return (
    <div className="font-mono">
      {/* <EasterEgg /> */}
      <StatusBar />
      <div className="h-screen pt-16 md:pt-12 px-4">{props.children}</div>
      <Dock />
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
      <div className="h-full w-full pt-1 flex justify-between items-center px-8 relative py-1 ">
        <TimeView className="lg:hidden" time={time} />
        <Laptop className="hidden lg:block text-white" size={16} />
        <div className="flex space-x-2 items-center lg:space-x-4">
          <CellularNetworkIcon className="lg:hidden" />
          <WifiIcon />
          <BatteryIcon />
          <TimeView className="hidden lg:block" time={time} />
        </div>
      </div>
    </div>
  );
}

function TimeView(props: { className?: string; time: string }) {
  return (
    <time className={cn("text-white text-xs", props.className)}>
      {props.time}
    </time>
  );
}

const DOCK_APPS = [
  {
    title: "Phone",
    icon: (
      <PhoneIcon className="h-full w-full text-neutral-600 dark:text-neutral-300" />
    ),
    href: `tel:${RESUME_DATA.phone}`,
  },
  {
    title: "Resume",
    icon: (
      <LucideFileBadge2 className="h-full w-full text-neutral-600 dark:text-neutral-300" />
    ),
    href: "/resume",
  },
  {
    title: "Mail",
    icon: (
      <Mail className="h-full w-full text-neutral-600 dark:text-neutral-300" />
    ),
    href: `mailto:${RESUME_DATA.email}`,
  },
];

function Dock() {
  return (
    <div className="absolute bottom-2 left-1/2 max-w-full -translate-x-1/2">
      <DockRoot className="items-end pb-3">
        {DOCK_APPS.map((app, idx) => (
          <Link key={idx} href={app.href}>
            <DockItem className="aspect-square rounded-xl bg-gray-200 dark:bg-neutral-800">
              <DockLabel>{app.title}</DockLabel>
              <DockIcon>{app.icon}</DockIcon>
            </DockItem>
          </Link>
        ))}
      </DockRoot>
    </div>
  );
}
