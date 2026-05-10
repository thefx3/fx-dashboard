import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--var-font-sans",
});

export const metadata: Metadata = {
  title: "F PAIR_",
  description: "Personal systems for trading, discipline and performance.",
  icons: {
    icon: [
      {
        url: "/brand/fp-dark.svg",
        type: "image/svg+xml",
      },
      {
        url: "/brand/fp-32-dark.png",
        sizes: "32x32",
        type: "image/png",
      },
      { url: "/brand/fp-128-dark.png", sizes: "128x128", type: "image/png" },
      { url: "/brand/fp-512-dark.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/fp-apple.png", sizes: "1024x1024", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={inter.variable}
    >
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
