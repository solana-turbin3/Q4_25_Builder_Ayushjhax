import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { AppbarClient } from "./components/AppbarClient";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wallet",
  description: "Simple wallet app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <Providers>
        <body className={inter.className}>
          <div className="min-w-screen min-h-screen grid-overlay">
            {/* Animated background layers */}
            <div aria-hidden className="aurora-layer">
              <div className="aurora" style={{ top: "-10%", left: "-10%" }} />
              <div className="aurora second" style={{ bottom: "-5%", right: "-15%" }} />
            </div>
            <div aria-hidden>
              <div className="glow-orb purple" style={{ width: 380, height: 380, top: 120, left: -120 }} />
              <div className="glow-orb blue" style={{ width: 320, height: 320, bottom: 160, right: -100 }} />
              <div className="glow-orb cyan" style={{ width: 260, height: 260, bottom: 40, left: 120 }} />
            </div>

            <AppbarClient />
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
              <div className="relative">
                <div className="absolute -inset-x-4 -top-2 h-px bg-gradient-to-r from-transparent via-indigo-200/60 to-transparent" />
                {children}
              </div>
            </main>
          </div>
        </body>
      </Providers>
    </html>
  );
}