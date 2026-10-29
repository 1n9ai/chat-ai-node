import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Leelawadee UI", "Tahoma", "system-ui", "sans-serif"],
      },
      colors: {
        // ชมพูแดง (โทนเดียวกับหน้าขาย) — ใช้เป็นไฮไลต์ (ลิงก์ สถานะ จุดเน้น) ไม่ใช้ถมพื้นใหญ่
        brand: {
          50: "color-mix(in srgb, var(--brand-50) calc(<alpha-value> * 100%), transparent)",
          100: "color-mix(in srgb, var(--brand-100) calc(<alpha-value> * 100%), transparent)",
          200: "color-mix(in srgb, var(--brand-200) calc(<alpha-value> * 100%), transparent)",
          300: "color-mix(in srgb, var(--brand-300) calc(<alpha-value> * 100%), transparent)",
          400: "color-mix(in srgb, var(--brand-400) calc(<alpha-value> * 100%), transparent)",
          500: "color-mix(in srgb, var(--brand-500) calc(<alpha-value> * 100%), transparent)",
          600: "color-mix(in srgb, var(--brand-600) calc(<alpha-value> * 100%), transparent)",
          700: "color-mix(in srgb, var(--brand-700) calc(<alpha-value> * 100%), transparent)",
          800: "color-mix(in srgb, var(--brand-800) calc(<alpha-value> * 100%), transparent)",
          900: "color-mix(in srgb, var(--brand-900) calc(<alpha-value> * 100%), transparent)",
        },
        // เทาอมอุ่น — พื้น/เส้น/ตัวหนังสือ
        accent: {
          50: "color-mix(in srgb, var(--accent-50) calc(<alpha-value> * 100%), transparent)",
          100: "color-mix(in srgb, var(--accent-100) calc(<alpha-value> * 100%), transparent)",
          200: "color-mix(in srgb, var(--accent-200) calc(<alpha-value> * 100%), transparent)",
          300: "color-mix(in srgb, var(--accent-300) calc(<alpha-value> * 100%), transparent)",
          400: "color-mix(in srgb, var(--accent-400) calc(<alpha-value> * 100%), transparent)",
          500: "color-mix(in srgb, var(--accent-500) calc(<alpha-value> * 100%), transparent)",
          600: "color-mix(in srgb, var(--accent-600) calc(<alpha-value> * 100%), transparent)",
          700: "color-mix(in srgb, var(--accent-700) calc(<alpha-value> * 100%), transparent)",
          800: "color-mix(in srgb, var(--accent-800) calc(<alpha-value> * 100%), transparent)",
          900: "color-mix(in srgb, var(--accent-900) calc(<alpha-value> * 100%), transparent)",
        },
        // ดำหมึก — ชั้นที่ตัดกับพื้นขาว (ปุ่มหลัก เมนูที่เลือก แถบเน้น)
        ink: {
          DEFAULT: "color-mix(in srgb, var(--ink) calc(<alpha-value> * 100%), transparent)",
          soft: "color-mix(in srgb, var(--ink-soft) calc(<alpha-value> * 100%), transparent)",
        },
      },
      backgroundImage: {
        // ดำหมึกไล่อมไวน์เข้ม — มีมิติแต่ยังนิ่ง
        "ink-grad": "linear-gradient(140deg, var(--ink-grad-from) 0%, var(--ink-grad-mid) 52%, var(--ink-grad-to) 100%)",
        // ชมพูแดงไล่ส้มอ่อน — ปุ่มหลัก ข้อความของผู้ใช้ (ชุดเดียวกับหน้าขาย)
        "brand-grad": "linear-gradient(100deg, var(--brand-grad-from) 0%, var(--brand-grad-mid) 55%, var(--brand-grad-to) 100%)",
        // จุดไฮไลต์เล็ก ๆ (ชื่อเดิมคงไว้ — ตอนนี้เป็นชมพูแดง)
        "azure-grad": "linear-gradient(135deg, var(--brand-400) 0%, var(--brand-grad-from) 100%)",
        // แสงขาวบนแผงลอย
        sheen: "linear-gradient(180deg, #ffffff 0%, #fcfaf9 100%)",
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgb(23 19 19 / 0.04), 0 2px 10px -3px rgb(23 19 19 / 0.06)",
        "soft-lg": "0 10px 30px -10px rgb(17 24 33 / 0.14), 0 22px 50px -18px rgb(17 24 33 / 0.16)",
        // แผงลอย — เงาฟุ้งยาวแบบจอในภาพตัวอย่าง
        float: "0 1px 0 0 rgb(255 255 255 / 0.9) inset, 0 2px 6px -2px rgb(17 24 33 / 0.05), 0 24px 48px -24px rgb(60 40 45 / 0.2)",
        ink: "0 10px 24px -10px rgb(15 21 29 / 0.55)",
        glow: "0 0 0 1px color-mix(in srgb, var(--brand-600) 16%, transparent), 0 10px 28px -10px color-mix(in srgb, var(--brand-600) 45%, transparent)",
        brand: "0 8px 22px -10px color-mix(in srgb, var(--brand-600) 55%, transparent)",
      },
    },
  },
  plugins: [],
};

export default config;
