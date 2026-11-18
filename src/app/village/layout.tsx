import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "slovenian designer village · design show & tell",
  description: "a snowy 3d village of the designers who came to design show & tell. walk around, say hi, find their work.",
  openGraph: {
    title: "slovenian designer village",
    description: "a snowy 3d village of the designers who came to design show & tell. walk around, say hi, find their work.",
    images: ["/og-image.png"],
  },
};

export default function VillageLayout({ children }: { children: React.ReactNode }) {
  return children;
}
