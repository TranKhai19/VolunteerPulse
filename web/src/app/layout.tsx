import type { Metadata } from "next";
import { Be_Vietnam_Pro, IBM_Plex_Mono, Lora } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const lora = Lora({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "VolunteerPulse — Bản đồ Điều phối & Minh bạch Tình nguyện Vùng cao",
  description:
    "Nền tảng tối ưu phân bổ ngân sách, ghép nhân sự theo kỹ năng và xác thực GPS minh bạch cho chiến dịch tình nguyện vùng cao Đại học Duy Tân.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${lora.variable} ${ibmPlexMono.variable}`}
    >
      <body className="antialiased min-h-screen bg-[#F2F4F0] text-[#122B26]">
        {children}
      </body>
    </html>
  );
}
