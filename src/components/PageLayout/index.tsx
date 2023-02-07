import { PropsWithChildren } from "react";
import Header from "../Header";

type Props = PropsWithChildren & {
  className?: string;
};

export default function PageLayout({ children, className }: Props) {
  return (
    <>
      <Header />
      <main className={className}>{children}</main>
    </>
  );
}
