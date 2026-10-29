"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { getBranding } from "@/lib/api";

// โลโก้ที่ร้านวางเองใน <data>/custom — ถามครั้งเดียวต่อการเปิดหน้า แล้วใช้ร่วมกันทุกจุด
let brandingLogo: Promise<string | null> | null = null;
function customLogo(): Promise<string | null> {
  brandingLogo ??= getBranding().then((b) => b.logo).catch(() => null);
  return brandingLogo;
}

// ไอคอนประจำแอป: โลโก้ของร้านถ้ามี ไม่งั้นไอคอนกลาง ๆ (ไม่มีแบรนด์)
export function AppMark({ size = 32 }: { size?: number }) {
  const [logo, setLogo] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    customLogo().then((l) => alive && setLogo(l));
    return () => {
      alive = false;
    };
  }, []);

  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- ไฟล์ของร้านเสิร์ฟจาก node เอง ไม่ผ่าน next/image
      <img data-ui="app-logo" src={logo} alt="" aria-hidden="true" style={{ width: size, height: size }}
        className="shrink-0 rounded-xl object-contain" />
    );
  }
  return (
    <span
      data-ui="app-logo"
      aria-hidden="true"
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm"
    >
      <Sparkles style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={2.2} />
    </span>
  );
}
