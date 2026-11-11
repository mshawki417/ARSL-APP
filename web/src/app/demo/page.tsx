import type { Metadata } from "next";
import { DemoApp } from "@/components/App";

export const metadata: Metadata = {
  title: "الديمو · مترجم لغة الإشارة العربية",
};

export default function DemoPage() {
  return <DemoApp />;
}
