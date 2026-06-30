import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"],
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Ragebait — Win the roast. Claim the Aura.",
  description:
    "Ragebait is an AI-powered competitive roast battle platform. Compete in roast battles and debates, earn Aura, and climb the leaderboards.",
};

// Root layout only owns <html>/<body> and global font/css setup now.
// Route groups (app) and (auth) each provide their own chrome below this,
// so logged-out auth pages never render the dashboard Sidebar/Navbar/Footer.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-body bg-atmosphere min-h-screen text-white">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
