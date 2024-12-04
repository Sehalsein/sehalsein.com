import { cn } from "@/lib/utils";
import React from "react";

type Props = {
  className?: string;
  appName?: string;
  icon: React.ReactNode;
  size: "sm" | "md" | "lg" | "xl";
  href?: string;
};

export default function AppIcon(props: Props) {
  return (
    <button className={cn("flex flex-col items-center", props.className)}>
      <div
        className={cn(
          "rounded-2xl overflow-hidden max-w-sm",
          props.size === "sm" && "h-[60px]",
          props.size === "md" && "h-[164px] w-full",
          props.size === "lg" && "h-[164px] w-full"
        )}
      >
        {props.icon}
      </div>
      {props.appName && (
        <span className="text-xs font-sans text-white mt-1.5">
          {props.appName}
        </span>
      )}
    </button>
  );
}
