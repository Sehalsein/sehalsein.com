import { PropsWithChildren } from "react";

type Props = PropsWithChildren & {
  title: string;
  className?: string;
};
export default function Section({ title, children, className }: Props) {
  return (
    <section className={className}>
      <h2 className="text-xl font-semibold uppercase">{title}</h2>
      {children}
    </section>
  );
}
