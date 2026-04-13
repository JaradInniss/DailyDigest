import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import PushSubscriber from "@/components/PushSubscriber";

export const metadata: Metadata = {
  title: "Daily Digest",
  description: "Your personal news digest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col antialiased bg-[#FEF2F2] text-[#450A0A]">
        <PushSubscriber />
        <NavBar />
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
