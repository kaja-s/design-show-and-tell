import type { Metadata } from "next";
import { JoinFlow } from "./join-flow";

export const metadata: Metadata = { title: "move into the village · design show & tell" };

export default function JoinPage() {
  return <JoinFlow />;
}
