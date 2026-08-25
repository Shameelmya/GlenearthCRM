import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Gleanearth CRM",
  description: "Human-facing control center for Gleanearth Constructions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground min-h-screen">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
