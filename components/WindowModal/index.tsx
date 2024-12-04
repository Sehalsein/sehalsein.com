import { cn } from "@/lib/utils";
import { PropsWithChildren } from "react";

type Props = PropsWithChildren & {};
export default function WindowModal(props: Props) {
  return (
    <div className="absolute top-[10%] left-20 z-10 h-1/2 max-w-8xl w-2/3 bg-neutral-950 rounded-2xl overflow-auto">
      <TabBar className="py-3 px-4" />
      {props.children}
    </div>
  );
}

function TabBar(props: { className?: string }) {
  return (
    <div className={cn("flex flex-row gap-2.5 ", props.className)}>
      <div className="bg-red-500 rounded-full h-3.5 w-3.5" />
      <div className="bg-yellow-500 rounded-full h-3.5 w-3.5" />
      <div className="bg-green-500 rounded-full h-3.5 w-3.5" />
    </div>
  );
}
