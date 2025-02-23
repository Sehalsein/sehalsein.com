import { PropsWithChildren } from "react";

export default function Tag({ children }: PropsWithChildren) {
  return (
    <span className="bg-blue-600 px-2 py-1 rounded-lg text-sm text-white font-medium print:p-0 print:text-black">
      {children}
    </span>
  );
}
