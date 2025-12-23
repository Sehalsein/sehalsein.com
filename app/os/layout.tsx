import type { PropsWithChildren } from "react";
import OSLayout from "@/src/pages/os/layout";

export default function Layout({ children }: PropsWithChildren) {
	return <OSLayout>{children}</OSLayout>;
}
