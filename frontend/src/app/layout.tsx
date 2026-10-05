import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI LawReview - 대한민국 법령 기반 AI 계약서 검토 서비스",
  description: "AI가 대한민국 법령을 기반으로 계약서 내 독소조항과 법적 리스크를 자동 분석합니다. 근로기준법, 민법, 하도급법 등 주요 법령을 실시간 대조하여 위험 요소를 시각화합니다.",
  keywords: ["AI 법률", "계약서 검토", "법령 분석", "독소조항", "법률 AI", "LawReview", "계약서 리스크"],
  openGraph: {
    title: "AI LawReview - AI 계약서 검토 서비스",
    description: "대한민국 법령 기반으로 계약서를 자동 분석하여 법적 리스크를 사전에 파악합니다.",
    type: "website",
    locale: "ko_KR",
    siteName: "AI LawReview",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
