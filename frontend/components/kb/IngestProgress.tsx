"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getIngestProgress, type IngestProgressItem } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const POLL_MS = 2000;

// ความคืบหน้าของไฟล์ที่กำลังนำเข้า — ตัวเลขมาจาก central (ชีตที่เสร็จ / ราว % ที่ AI จัดโครงสร้าง / chunk ที่เขียนแล้ว)
// ถามทุก 2 วินาทีระหว่างอัปโหลด และถามครั้งหนึ่งตอนเปิดหน้า เผื่อมีไฟล์ค้างจากแท็บอื่นหรือก่อนรีเฟรช
export function IngestProgress({ kbId, active, onFinished }: { kbId: string; active: boolean; onFinished?: () => void }) {
  const { t } = useI18n();
  const [items, setItems] = useState<IngestProgressItem[]>([]);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let hadItems = false;
    const tick = async () => {
      try {
        const r = await getIngestProgress(kbId);
        if (stopped) return;
        setItems(r.items);
        if (hadItems && r.items.length === 0 && !active) onFinished?.();
        hadItems = r.items.length > 0;
        if (active || r.items.length > 0) timer = setTimeout(tick, POLL_MS);
      } catch {
        if (!stopped && active) timer = setTimeout(tick, POLL_MS);
      }
    };
    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kbId, active]);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {items.map((it) => {
        const pct =
          it.unit === "percent" ? it.percent ?? 0
          : it.total ? Math.round(((it.done ?? 0) * 100) / it.total)
          : null;
        const stageKey = `kb.progress.stage.${it.stage}`;
        const stageText = t(stageKey) === stageKey ? t("kb.progress.stage.working") : t(stageKey);
        const detail =
          it.unit === "sheet" ? t("kb.progress.sheets", { done: it.done ?? 0, total: it.total ?? 0 })
          : it.unit === "chunk" ? t("kb.progress.chunks", { done: it.done ?? 0, total: it.total ?? 0 })
          : it.unit === "percent" ? t("kb.progress.percent", { percent: it.percent ?? 0 })
          : "";
        const mins = Math.floor((it.elapsed_s ?? 0) / 60);
        const secs = (it.elapsed_s ?? 0) % 60;
        return (
          <div key={it.filename} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-slate-700">
                <Loader2 size={14} className="shrink-0 animate-spin text-brand-600" />
                <span className="truncate">{it.filename}</span>
              </span>
              <span className="shrink-0 text-xs text-slate-400">{t("kb.progress.elapsed", { min: mins, sec: secs })}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full bg-brand-500 transition-all duration-500 ${pct === null ? "w-1/3 animate-pulse" : ""}`}
                style={pct === null ? undefined : { width: `${Math.max(3, pct)}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {stageText}
              {detail ? ` · ${detail}` : ""}
              {it.pages ? ` · ${t("kb.progress.pages", { pages: it.pages })}` : ""}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">{t("kb.progress.keep_open")}</p>
          </div>
        );
      })}
    </div>
  );
}
