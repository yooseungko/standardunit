import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://standardunit.kr'),
  title: {
    default: "스탠다드 유닛 | 인테리어 표준 견적",
    template: "%s | 스탠다드 유닛",
  },
  description: "대한민국 인테리어 견적의 표준, 스탠다드 유닛",
  keywords: [
    "아파트 인테리어",
    "인테리어 견적",
    "인테리어 무료견적",
    "아파트 리모델링",
    "인테리어 비용",
    "32평 인테리어",
    "24평 인테리어",
    "인테리어 업체",
    "인테리어 시공",
    "투명한 견적",
    "표준 견적",
  ],
  authors: [{ name: "Standard Unit", url: "https://standardunit.kr" }],
  creator: "Standard Unit",
  publisher: "Standard Unit",
  formatDetection: {
    telephone: true,
    email: true,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://standardunit.kr",
    siteName: "Standard Unit",
    title: "아파트 인테리어 무료 견적 | Standard Unit",
    description: "왜 같은 84㎡인데 견적은 3천만원부터 8천만원까지? 3,847건 실시공 데이터 기반 투명한 표준 견적. 무료 상담 후 검증된 파트너사 매칭.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Standard Unit - 아파트 인테리어 표준 견적",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "아파트 인테리어 무료 견적 | Standard Unit",
    description: "3,847건 실시공 데이터 기반 투명한 표준 견적. 무료 상담 후 검증된 파트너사 매칭.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // 실제 Google/Naver 인증 코드로 교체 필요
    // google: "your-google-verification-code",
    // other: { "naver-site-verification": "your-naver-code" },
  },
};

// JSON-LD 구조화 데이터
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://standardunit.kr/#organization",
      name: "Standard Unit",
      url: "https://standardunit.kr",
      logo: {
        "@type": "ImageObject",
        url: "https://standardunit.kr/logo.png",
      },
      description: "아파트 인테리어 표준 견적 서비스",
      contactPoint: {
        "@type": "ContactPoint",
        telephone: "+82-1588-0000",
        contactType: "customer service",
        availableLanguage: "Korean",
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://standardunit.kr/#website",
      url: "https://standardunit.kr",
      name: "Standard Unit",
      publisher: {
        "@id": "https://standardunit.kr/#organization",
      },
      potentialAction: {
        "@type": "SearchAction",
        target: "https://standardunit.kr/?s={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "LocalBusiness",
      "@id": "https://standardunit.kr/#localbusiness",
      name: "Standard Unit",
      image: "https://standardunit.kr/og-image.png",
      description: "아파트 인테리어 무료 견적 및 시공 매칭 서비스. 3,847건의 실시공 데이터를 기반으로 투명하고 합리적인 견적을 제공합니다.",
      url: "https://standardunit.kr",
      telephone: "+82-1588-0000",
      priceRange: "₩₩₩",
      address: {
        "@type": "PostalAddress",
        addressLocality: "서울",
        addressCountry: "KR",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.8",
        reviewCount: "127",
      },
      openingHoursSpecification: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
    },
    {
      "@type": "Service",
      "@id": "https://standardunit.kr/#service",
      name: "아파트 인테리어 견적 서비스",
      provider: {
        "@id": "https://standardunit.kr/#organization",
      },
      serviceType: "인테리어 견적",
      description: "아파트 평형별 표준화된 인테리어 견적 산출 및 검증된 시공사 매칭 서비스",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KRW",
        description: "무료 견적 상담",
      },
      areaServed: {
        "@type": "Country",
        name: "대한민국",
      },
    },
    {
      "@type": "FAQPage",
      "@id": "https://standardunit.kr/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "아파트 인테리어 견적은 어떻게 산출되나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Standard Unit은 3,847건의 실제 시공 데이터를 기반으로 평형, 자재 등급, 시공 범위에 따른 표준 견적을 산출합니다. 32평 기준 평균 4,200만원이며, 자재 등급에 따라 달라집니다.",
          },
        },
        {
          "@type": "Question",
          name: "견적 상담 비용이 있나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "아니요, Standard Unit의 모든 견적 상담은 무료입니다. 온라인으로 3분 내에 견적 요청을 하시면 24시간 내에 상세 견적서를 받아보실 수 있습니다.",
          },
        },
        {
          "@type": "Question",
          name: "시공은 누가 하나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Standard Unit의 표준 견적을 인정하는 검증된 파트너 시공사가 진행합니다. 시공 이력, 고객 평점, AS 처리율을 기준으로 엄선된 47개 시공사 중 지역과 일정에 맞는 업체를 매칭해드립니다.",
          },
        },
        {
          "@type": "Question",
          name: "추가 비용이 발생하면 어떻게 되나요?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Standard Unit은 가격 보장 계약을 체결합니다. 견적과 다른 금액이 청구될 경우, 차액의 200%를 보상해드립니다.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* SUIT Variable Font */}
        <link
          href="https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/variable/woff2/SUIT-Variable.css"
          rel="stylesheet"
        />
        {/* Favicon */}
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        <link rel="manifest" href="/manifest.json" />
        {/* JSON-LD 구조화 데이터 */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${ibmPlexMono.variable} antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
