import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sehal Sein",
  description:
    "Software Engineer with hands-on experience in building real world react application and web services.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <main>{children}</main>
      </body>
    </html>
  );
}
