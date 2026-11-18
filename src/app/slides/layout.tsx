import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "slides · design show & tell",
  robots: { index: false, follow: false },
};

export default function SlidesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
