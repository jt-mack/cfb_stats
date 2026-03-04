import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalStateProvider } from "@/context/GlobalStateContext";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "College Football Stats",
  description: "CFB stats and team info",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
      >
        <GlobalStateProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-3.5rem)] bg-zinc-900 text-zinc-100 overflow-x-hidden">
            <div className="mx-auto max-w-7xl px-3 sm:px-4 py-4">{children}</div>
          </main>
        </GlobalStateProvider>
      </body>
    </html>
  );
}
