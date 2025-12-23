import type { PropsWithChildren } from "react";
import ResumeLayout from "@/src/pages/resume/layout";

export default function Layout({ children }: PropsWithChildren) {
	return <ResumeLayout>{children}</ResumeLayout>;
}
