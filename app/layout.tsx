import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--var-font-sans",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--var-font-title",
});

export const metadata: Metadata = {
  title: "My dashboard",
  description: "Admin & Personnal Dashboard",
  icons: {
    icon: [
      { url: "/logo-light.png", media: "(prefers-color-scheme: light)" },
      { url: "/logo-dark.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/logo-light.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${playfair.variable}`}
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
