import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// metadata = 화면에는 안 그려지지만 <head>에 들어가는 정보.
// 브라우저 탭 이름, 북마크 이름, 카톡/문자로 링크를 보냈을 때 뜨는 미리보기가 전부 이걸 읽는다.
export const metadata: Metadata = {
  title: "RU-Vibe · The Scarlet Drop",
  description: "Live party heatmap for Rutgers. Where the pins pile up is where it's happening.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
