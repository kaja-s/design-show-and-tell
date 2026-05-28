import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";
import { CaseProvider } from "./case-provider";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "design show & tell",
  description: "a gathering for designers to share work, give feedback, and connect.",
  icons: {
    icon: '/favicon.png',
  },
  openGraph: {
    title: "design show & tell",
    description: "a gathering for designers to share work, give feedback, and connect.",
    images: ['/og-image.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "design show & tell",
    description: "a gathering for designers to share work, give feedback, and connect.",
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
                const caseMode = localStorage.getItem('caseMode') || 'lower';
                document.documentElement.setAttribute('data-case', caseMode);
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <CaseProvider>{children}</CaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
