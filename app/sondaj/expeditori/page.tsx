import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SurveyForm } from "@/components/survey/SurveyForm";

export const metadata: Metadata = {
  title: "Sondaj pentru expeditori",
  description:
    "Împărtășește cum trimiți pachete și ce ți-ar economisi timp. Ne ajută să construim platforma cum trebuie.",
};

export default function SenderSurveyPage() {
  return (
    <main className="survey-page">
      <header className="survey-header">
        <Link href="/" className="survey-back">
          ← hulubul.com
        </Link>
        <p className="survey-eyebrow">Sondaj pentru expeditori</p>
        <h1 className="serif">Cum trimiți un colet acasă?</h1>
        <p className="survey-lead">
          Suntem la început și vrem să construim platforma pe ce ai nevoie
          tu — nu pe presupunerile noastre. Durează ~3 minute. Toate
          întrebările în afară de identitate sunt opționale.
        </p>
        <p className="legal-meta">
          Ești transportator, nu expeditor? Sondajul pentru voi vine curând —
          între timp poți să te înscrii pe{" "}
          <Link href="/#signup">lista de așteptare</Link>.
        </p>
      </header>

      <Suspense fallback={null}>
        <SurveyForm />
      </Suspense>
    </main>
  );
}
