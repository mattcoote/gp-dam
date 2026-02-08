import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "GENERAL PUBLIC | Art Catalog",
  description:
    "Browse, curate, and share art prints from the General Public collection.",
  openGraph: {
    title: "GENERAL PUBLIC | Art Catalog",
    description:
      "Browse, curate, and share art prints from the General Public collection.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${oswald.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
