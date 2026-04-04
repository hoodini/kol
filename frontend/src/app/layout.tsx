import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/layout/client-layout";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["latin", "hebrew"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Blitz AI — סטודיו תמלול מקצועי",
  description:
    "תמלול אודיו ווידאו מקצועי עם תמיכה מובנית בעברית. Whisper, Groq, Gemini, ivrit-ai.",
  authors: [{ name: "Yuval Avidani", url: "https://yuv.ai" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full font-sans bg-background text-foreground">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
