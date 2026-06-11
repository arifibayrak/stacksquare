import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: "StackSquare · Strategy meets Capital",
  description:
    "StackSquare convenes founders, investors, and operators. Fireside rooms, expert sessions, and peer gatherings where strategy, capital, stack, and psychology meet. Register on Luma.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://stacksquare.ai",
  ),
  openGraph: {
    title: "StackSquare",
    description:
      "Events for founders, investors, and operators. Strategy meets capital.",
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
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </body>
      </html>
    </ClerkProvider>
  );
}
