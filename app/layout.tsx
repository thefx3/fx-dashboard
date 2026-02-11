import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";

export const metadata: Metadata = {
  title: "My dashboard",
  description: "Admin & Personnal Dashboard",
  icons: {
    icon: [
      { url: "/logo-white.png", media: "(prefers-color-scheme: light)" },
      { url: "/logo-black.png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/logo-white.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
