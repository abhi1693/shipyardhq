"use client";

import dynamic from "next/dynamic";
import { PLATFORMS } from "@/lib/productWizard/constants";

const Step1 = dynamic(() => import("@/app/(member)/member/products/shared/step1"));
const Step2 = dynamic(() => import("@/app/(member)/member/products/shared/step2"));
const Step3 = dynamic(() => import("@/app/(member)/member/products/shared/step3"));
const Step4 = dynamic(() => import("@/app/(member)/member/products/shared/step4"));
const Review = dynamic(() => import("@/app/(member)/member/products/shared/review"));

export function renderStep(step: number, args: {
  categories: { id: string; name: string }[];
  organizations: { id: string; name: string }[];
}) {
  switch (step) {
    case 1:
      return <Step1 categories={args.categories} platforms={PLATFORMS as any} />
    case 2:
      return <Step2 />
    case 3:
      return <Step3 />
    case 4:
      return <Step4 organizations={args.organizations} />
    default:
      return <Review categories={args.categories} organizations={args.organizations} />
  }
}
