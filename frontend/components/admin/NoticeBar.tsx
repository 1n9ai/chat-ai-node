"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { claimLicense, getAdminStatus, getAlerts, getNotice, type AdminAlert, type Notice, type TaskStatus } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

// ปุ่มพาไปหน้าที่แก้ปัญหาได้ ของแต่ละรหัสเตือน
const ALERT_LINK: Record<AdminAlert["code"], { href: string; label: string }> = {
  source_held: { href: "/kb/", label: "notice.alerts.open_kb" },
  source_error: { href: "/kb/", label: "notice.alerts.open_kb" },
  ai_quota: { href: "/admin/settings/", label: "notice.alerts.open_settings" },
  ai_key: { href: "/admin/settings/", label: "notice.alerts.open_settings" },
  line_error: { href: "/admin/channels/", label: "notice.alerts.open_channels" },
  task_limit_missed: { href: "/admin/", label: "notice.renew" },
};

// แถบแจ้งเตือนบนทุกหน้าหลังบ้าน:
// - Free Beta ใกล้จบ (มีวันที่) / จบแล้ว — ข้อมูลจาก central ผ่าน /api/admin/notice
// - เรื่องที่ทำให้บอทตอบผิด/ไม่ตอบโดยเจ้าของไม่รู้ตัว (ข้อมูลสดถูกพัก/ดึงไม่ได้, AI key หมดโควตา/ผิด) — /api/admin/alerts
export function NoticeBar() {
  const { t, locale } = useI18n();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [tasks, setTasks] = useState<TaskStatus | null>(null);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [displaced, setDisplaced] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    getNotice()
      .then((r) => {
        setNotice(r.notice);
        setTasks(r.tasks ?? null);
      })
      .catch(() => undefined);
    getAlerts()
      .then((r) => setAlerts(r.alerts))
      .catch(() => undefined);
    getAdminStatus()
      .then((s) => setDisplaced(!!s.license?.displaced))
      .catch(() => undefined);
  }, []);

  async function claim() {
    if (!window.confirm(t("notice.displaced.confirm"))) return;
    setClaiming(true);
    try {
      await claimLicense();
      window.location.reload();
    } catch {
      setClaiming(false);
    }
  }

  const ended = notice?.code === "beta_ended";
  const date = notice?.ends_at
    ? new Date(notice.ends_at).toLocaleDateString(
        { th: "th-TH", ja: "ja-JP", zh: "zh-CN" }[locale as string] ?? "en-US",
        { dateStyle: "long" },
      )
    : "";
  const dateLocale = { th: "th-TH", ja: "ja-JP", zh: "zh-CN" }[locale as string] ?? "en-US";
  const untilDate = tasks?.unlimited_until ? new Date(tasks.unlimited_until).toLocaleDateString(dateLocale, { dateStyle: "long" }) : "";
  const reached = !!tasks && tasks.limit !== null && tasks.used >= tasks.limit;
  return (
    <>
      {displaced && (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
          <AlertTriangle size={16} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t("notice.displaced.title")}</p>
            <p className="mt-0.5 text-xs">{t("notice.displaced.body")}</p>
          </div>
          <button
            type="button"
            onClick={claim}
            disabled={claiming}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow-soft ring-1 ring-inset ring-black/5 disabled:opacity-60"
          >
            {t("notice.displaced.claim")}
          </button>
        </div>
      )}
      {tasks && tasks.limit !== null && (
        <div
          role="status"
          className={`mb-6 rounded-2xl px-4 py-3 text-sm ring-1 ring-inset ${reached ? "bg-rose-50 text-rose-900 ring-rose-200" : "bg-white text-accent-800 ring-accent-200"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{t("notice.tasks.used", { used: tasks.used, limit: tasks.limit })}</p>
            <p className="text-xs text-accent-500">{t("notice.tasks.resets")}</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-accent-100">
            <div className={`h-full rounded-full ${reached ? "bg-rose-500" : "bg-brand-500"}`} style={{ width: `${Math.min(100, (tasks.used / Math.max(1, tasks.limit)) * 100)}%` }} />
          </div>
          {reached && <p className="mt-2 text-xs">{t("notice.tasks.reached")}</p>}
        </div>
      )}
      {tasks && tasks.limit === null && tasks.unlimited_until && (
        <div role="status" className="mb-6 rounded-2xl bg-white px-4 py-3 text-sm text-accent-800 ring-1 ring-inset ring-accent-200">
          {t("notice.tasks.unlimited", { date: untilDate, n: tasks.after_limit ?? 0 })}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className={`mb-6 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm ring-1 ring-inset ${
            ended ? "bg-rose-50 text-rose-900 ring-rose-200" : "bg-amber-50 text-amber-900 ring-amber-200"
          }`}
        >
          <AlertTriangle size={16} className="shrink-0" />
          <p className="min-w-0 flex-1">{ended ? t("notice.beta_ended") : t("notice.beta_ending", { date, n: tasks?.after_limit ?? 0 })}</p>
          <Link href="/admin/" className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow-soft ring-1 ring-inset ring-black/5">
            {t("notice.renew")}
          </Link>
        </div>
      )}
      {alerts.map((a, i) => (
        <div
          key={`${a.code}-${a.name}-${i}`}
          role="alert"
          className={`mb-3 flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-sm ring-1 ring-inset ${
            a.code === "source_held" ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-rose-50 text-rose-900 ring-rose-200"
          }`}
        >
          <AlertTriangle size={16} className="shrink-0" />
          <p className="min-w-0 flex-1">{t(`notice.alerts.${a.code}`, { name: a.name, detail: a.detail ?? "", count: a.count ?? 0 })}</p>
          <Link
            href={ALERT_LINK[a.code].href}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow-soft ring-1 ring-inset ring-black/5"
          >
            {t(ALERT_LINK[a.code].label)}
          </Link>
        </div>
      ))}
    </>
  );
}
