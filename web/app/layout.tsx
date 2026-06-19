import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FindMyShot",
  description: "Guests find their event photos instantly with AI face search."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
