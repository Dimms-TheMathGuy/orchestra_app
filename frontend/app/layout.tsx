import type { Metadata } from "next";
import { Inter, Lato, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./context/AuthContext";
import { LocaleProvider } from "./context/LocaleContext";
import { Toaster } from "sonner";

// Inter is the global/default font for the whole app
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Lato is used for the Zoom widget
const lato = Lato({
  variable: "--font-lato",
  weight: ["400", "700"],
  subsets: ["latin"],
});

// Geist Mono is used for the GitHub widget
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Orchestra",
  description: "Project collaboration platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`
          ${inter.variable}
          ${lato.variable}
          ${geistMono.variable}
          font-sans antialiased
        `}
      >
        <ThemeProvider>
          <LocaleProvider>
            <AuthProvider>
              {children}
              <Toaster position="top-right" />
            </AuthProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}