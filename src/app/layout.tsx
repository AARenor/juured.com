import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "juured.com — Estonian property decisions, not listings",
  description:
    "Free, open-data decision support for Estonian property buyers. Type an address. Get the data kv.ee doesn't show you.",
  openGraph: {
    title: "juured.com",
    description: "Estonian property decisions, not listings.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-body antialiased">{children}</body>
    </html>
  );
}
