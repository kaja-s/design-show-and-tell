import type { Metadata } from "next";
import { Admin } from "./admin";

export const metadata: Metadata = { title: "village admin", robots: { index: false } };

export default function AdminPage() {
  return <Admin />;
}
