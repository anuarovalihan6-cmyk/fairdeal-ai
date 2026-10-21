import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "FairDeal AI — Clear terms. Better work.", description: "A local hackathon prototype for clearer freelance agreements and PayPal Sandbox test payments." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
