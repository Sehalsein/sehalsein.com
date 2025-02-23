import { Magnetic } from "@/src/components/ui/magnetic";
import { cn } from "@/src/lib/utils";
import Link from "next/link";
import React from "react";

type Props = {
  className?: string;
  appName?: string;
  icon: React.ReactNode;
  href: string;
};

export default function AppIcon(props: Props) {
  const target = props.href.startsWith("http") ? "_blank" : undefined;
  return (
    <Magnetic>
      <Link
        href={props.href}
        className={cn("flex flex-col items-center", props.className)}
        target={target}
      >
        <div className="aspect-square rounded-2xl bg-gray-200 dark:bg-neutral-800 overflow-hidden">
          {props.icon}
        </div>

        <span className="w-fit whitespace-pre px-2 py-0.5 text-xs text-neutral-700 dark:text-white">
          {props.appName}
        </span>
      </Link>
    </Magnetic>
  );
}
