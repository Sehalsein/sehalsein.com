import type { PropsWithChildren } from "react";
import ResumeLayout from "@/src/page/resume/layout";

export default function Layout({ children }: PropsWithChildren) {
	return <ResumeLayout>{children}</ResumeLayout>;
}
