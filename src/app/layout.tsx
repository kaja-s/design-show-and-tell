import type { Metadata } from "next";
import { Geist_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";
import { CaseProvider } from "./case-provider";
import { Analytics } from "@vercel/analytics/next";
import { PageLoader } from "./components/page-loader";

// the village's name, set in pixels like the village itself
const pixelify = Pixelify_Sans({
  variable: "--font-pixel",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://design-show-and-tell.vercel.app"),
  title: "design show & tell",
  description: "designers showing each other work in progress. live demos, no slides. ljubljana, late november 2026.",
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: "design show & tell",
    description: "a gathering for designers to share work, give feedback, and connect. next event: late november 2026.",
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "design show & tell",
    description: "a gathering for designers to share work, give feedback, and connect. next event: late november 2026.",
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} ${pixelify.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme');
                // the join flow (opened from the slide's qr code) is always light
                const lightOnly = location.pathname.startsWith('/village/join');
                if (!lightOnly && (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches))) {
                  document.documentElement.classList.add('dark');
                }
                const caseMode = localStorage.getItem('caseMode') || 'lower';
                document.documentElement.setAttribute('data-case', caseMode);
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <PageLoader />
        <ThemeProvider>
          <CaseProvider>{children}</CaseProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
