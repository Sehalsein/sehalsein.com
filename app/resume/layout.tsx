import { PropsWithChildren } from "react";

export default function Layout({ children }: PropsWithChildren) {
  return (
    <div className="flex items-center justify-center p-0 md:p-6">
      <div className="flex flex-col gap-4 max-w-3xl bg-white dark:bg-black shadow-sm rounded-lg px-8 py-10 text-black dark:text-white">
        {children}
      </div>
    </div>
  );
}
