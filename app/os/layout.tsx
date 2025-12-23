import type { PropsWithChildren } from "react";
import OSLayout from "@/src/page/os/layout";

export default function Layout({ children }: PropsWithChildren) {
	return <OSLayout>{children}</OSLayout>;
}
