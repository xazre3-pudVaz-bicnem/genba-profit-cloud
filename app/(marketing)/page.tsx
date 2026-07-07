import type { Metadata } from "next";
import { FaqSection } from "@/components/marketing/sections/faq-section";
import { FeatureSection } from "@/components/marketing/sections/feature-section";
import { FinalCtaSection } from "@/components/marketing/sections/final-cta-section";
import { HeroSection } from "@/components/marketing/sections/hero-section";
import { IndustrySection } from "@/components/marketing/sections/industry-section";
import { PricingSection } from "@/components/marketing/sections/pricing-section";
import { ProblemSection } from "@/components/marketing/sections/problem-section";
import { ScreenMockSection } from "@/components/marketing/sections/screen-mock-section";
import { SolutionSection } from "@/components/marketing/sections/solution-section";
import { APP_DESCRIPTION, APP_NAME, SITE_URL } from "@/lib/shared/config";
import { FAQ_ITEMS, PLANS } from "@/lib/marketing/content";

export const metadata: Metadata = {
  keywords: [
    "建設業 収支管理",
    "工事 原価管理 アプリ",
    "案件 利益管理",
    "現場 レシート管理",
    "一人親方 経費管理",
    "工務店 粗利管理",
  ],
  alternates: { canonical: "/" },
};

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: APP_NAME,
        url: SITE_URL,
        description: APP_DESCRIPTION,
      },
      {
        "@type": "SoftwareApplication",
        name: APP_NAME,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, iOS, Android",
        description: APP_DESCRIPTION,
        offers: PLANS.map((p) => ({
          "@type": "Offer",
          name: `${p.name}プラン`,
          price: p.price,
          priceCurrency: "JPY",
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ_ITEMS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

/** 営業・販売用LP（アプリ機能は一切含まない） */
export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <FeatureSection />
      <ScreenMockSection />
      <IndustrySection />
      <PricingSection />
      <FaqSection />
      <FinalCtaSection />
    </>
  );
}
