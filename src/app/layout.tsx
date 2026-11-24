import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Neon Arcade — Memory Match + 4 More Games",
  description:
    "A 5-game neon arcade: Memory Match with 3D card flips and streak fanfares, Fruit Catcher, Simon Says, 2048 and Whack-a-Mole. Procedural synthwave audio, XP levels, coins, achievements, blog and shop.",
  keywords: ["arcade games", "memory match", "2048", "simon says", "fruit catcher", "whack-a-mole", "browser games"],
  openGraph: {
    title: "Neon Arcade",
    description: "Five glowing games. One arcade. Play, level up, spend coins.",
    siteName: "Neon Arcade",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#08010f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: "#08010f" }}
      >
        {children}
        <Toaster
          theme="dark"
          position="top-center"
          toastOptions={{
            style: {
              background: "rgba(22,8,38,.96)",
              border: "1px solid rgba(232,121,249,.3)",
              color: "#f4ecff",
              boxShadow: "0 0 30px rgba(232,121,249,.15)",
            },
          }}
        />
      </body>
    </html>
  );
}
