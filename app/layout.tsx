import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "함께걸음 · TripForAll",
  description:
    "가장 느린 사람을 기준으로, 모두가 즐거운 여행. 한국관광공사 무장애 데이터를 AI가 다정하게 해석합니다."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
