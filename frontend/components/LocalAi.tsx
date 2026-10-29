"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, HardDrive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getLocalAi, installLocalAi, type LocalAiStatus } from "@/lib/api";
import { errorText, useI18n } from "@/lib/i18n";

// ติดตั้ง Ollama + โมเดลชุดที่ทดสอบแล้ว ให้ลูกค้าที่ไม่มี API key ใช้งานได้ทันที (ค่าเริ่มต้นยังเป็น API key บน cloud)
// เตือนตามเครื่องจริง: ไม่พบการ์ดจอแยก = ช้า, RAM/พื้นที่ไม่พอ · แนะนำ API key ทุกเครื่อง
export function LocalAi({ onDone, onUseKey }: { onDone?: () => void; onUseKey?: () => void }) {
  const { t } = useI18n();
  const [st, setSt] = useState<LocalAiStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const notified = useRef(false);

  const load = useCallback(async () => {
    try {
      setSt(await getLocalAi());
    } catch (e) {
      setErr(errorText(t, e));
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  const running = st?.job.state === "running";
  useEffect(() => {
    if (!running) return;
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, [running, load]);

  useEffect(() => {
    if (st?.job.state === "done" && !notified.current) {
      notified.current = true;
      onDone?.();
    }
  }, [st?.job.state, onDone]);

  async function install() {
    setStarting(true);
    setErr(null);
    try {
      await installLocalAi();
      await load();
    } catch (e) {
      setErr(errorText(t, e));
    } finally {
      setStarting(false);
    }
  }

  if (!st) return err ? <p className="text-sm text-rose-700">{err}</p> : <Loader2 className="animate-spin text-accent-400" size={16} />;

  const hw = st.hardware;
  const lowRam = hw.ram_gb !== null && hw.ram_gb + 0.5 < hw.min_ram_gb;
  const needModels = !(st.llm_ready && st.embedding_ready);
  const lowDisk = needModels && hw.disk_free_gb !== null && hw.disk_free_gb < hw.min_disk_gb;
  const manual = !st.ollama_running && !hw.can_install_ollama;
  const job = st.job;
  const done = job.state === "done";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-accent-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700">
          <HardDrive size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-accent-900">{t("local_ai.title")}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-accent-500">{t("local_ai.intro", { gb: hw.download_gb })}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-accent-500">{t("local_ai.spec")}</p>
        </div>
      </div>
      {!hw.gpu && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">{t("local_ai.no_gpu")}</p>}
      {lowRam && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{t("local_ai.low_ram", { ram: hw.ram_gb ?? 0, min: hw.min_ram_gb })}</p>}
      {lowDisk && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{t("local_ai.low_disk", { free: hw.disk_free_gb ?? 0, min: hw.min_disk_gb })}</p>}
      {manual && <p className="rounded-lg bg-accent-50 px-3 py-2 text-xs text-accent-700">{t("local_ai.need_ollama")}</p>}
      <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-900">{t("local_ai.quality")}</p>

      {running && (
        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-2 text-sm text-accent-700">
            <Loader2 size={14} className="animate-spin" /> {t(`local_ai.step.${job.step ?? "check"}`)}
            {typeof job.progress === "number" && <span className="text-xs text-accent-400">{job.progress}%</span>}
          </p>
          {typeof job.progress === "number" && (
            <div className="h-1.5 overflow-hidden rounded-full bg-accent-100">
              <div className="h-full bg-brand-grad transition-all" style={{ width: `${job.progress}%` }} />
            </div>
          )}
          <p className="text-[11px] text-accent-400">{t("local_ai.keep_open")}</p>
        </div>
      )}
      {done && (
        <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          <CheckCircle2 size={15} /> {t("local_ai.ready")}
        </p>
      )}
      {job.state === "error" && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{t("local_ai.error", { detail: job.error ?? job.error_code ?? "" })}</p>}
      {err && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{err}</p>}

      {!done && (
        <div className="flex flex-wrap justify-end gap-2">
          {onUseKey && (
            <Button variant="ghost" onClick={onUseKey} disabled={running}>
              {t("local_ai.use_key")}
            </Button>
          )}
          <Button onClick={install} disabled={running || starting || lowDisk}>
            {(running || starting) && <Loader2 size={15} className="animate-spin" />}
            {t("local_ai.install")}
          </Button>
        </div>
      )}
    </div>
  );
}
