import { cn } from "@/lib/utils";
import Link from "next/link";
import React from "react";

type Props = {
  className?: string;
  appName?: string;
  icon: React.ReactNode;
  size: "sm" | "md" | "lg" | "xl";
  href: string;
};

export default function AppIcon(props: Props) {
  const target = props.href.startsWith("http") ? "_blank" : undefined;
  return (
    <Link
      href={props.href}
      className={cn("flex flex-col items-center", props.className)}
      target={target}
    >
      <div
        className={cn(
          "rounded-2xl overflow-hidden max-w-sm",
          props.size === "sm" && "h-[60px]",
          props.size === "md" &&
            "h-[164px] w-full lg:min-w-[164px] lg:max-w-[164px]",
          props.size === "lg" &&
            "h-[164px] lg:h-fit min-h-[164px] w-full max-w-2xl"
        )}
      >
        {props.icon}
      </div>
      {props.appName && (
        <span className="text-xs font-sans text-white mt-1.5">
          {props.appName}
        </span>
      )}
    </Link>
  );
}
