import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "GitHub PoC Analyzer",
  description: "Portfolio-focused analysis for GitHub proof-of-concept repositories."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
