import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StackSquare — Strategy meets Capital",
  description:
    "Two Imperial MSc students bridging strategy and capital — unfiltered conversations with the people who build, fund, and advise the businesses we want to learn from.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://stacksquare.ai",
  ),
  openGraph: {
    title: "StackSquare",
    description: "Strategy meets capital. A 2-on-1 podcast.",
    url: "https://stacksquare.ai",
    siteName: "StackSquare",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
