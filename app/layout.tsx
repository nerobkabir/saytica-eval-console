import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Saytica Eval Console",
  description: "AI Model Evaluation & Annotation Task Management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
          <Navbar />
          <main style={{ padding: "0 0 48px 0" }}>{children}</main>
        </div>
      </body>
    </html>
  );
}
