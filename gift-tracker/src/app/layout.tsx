import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Harshita's 40th — Gift Board",
  description: "Forty gifts, one secret party. Plan them together.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0711",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <div className="party-backdrop" aria-hidden />
        {children}
      </body>
    </html>
  );
}
