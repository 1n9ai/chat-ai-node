"use client";

import { AlertTriangle, CheckCircle2, FileText, Loader2, RefreshCw, Sigma, Sparkles, Trash2 } from "lucide-react";
import { DocDropzone } from "@/components/kb/DocDropzone";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n";
import type { SkillFile, SkillSet } from "@/lib/types";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ผลการอ่านไฟล์สูตร: รูปแบบเดิม / AI อ่าน / อ่านไม่ได้ (พร้อมสาเหตุ — รหัส error แปลจาก locales errors.*)
function FileStatus({ f }: { f: SkillFile }) {
  const { t } = useI18n();
  if (f.error) {
    let text: string;
    if (f.error.startsWith("ai_failed:")) {
      const code = f.error.slice("ai_failed:".length);
      const key = `errors.${code}`;
      text = t("skills.err_ai_failed", { reason: t(key) === key ? code : t(key) });
    } else {
      text = t(f.error === "none_found" ? "skills.err_none_found" : "skills.err_not_read");
    }
    return (
      <p className="mt-1 flex items-start gap-1 text-xs text-amber-700">
        <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {text}
      </p>
    );
  }
  const n = f.skills_count ?? 0;
  const key = f.method === "ai" ? "skills.method_ai" : f.method === "legacy" ? "skills.method_legacy" : "skills.method_local";
  return (
    <p className="mt-1 flex items-center gap-1 text-xs text-brand-700">
      {f.method === "ai" ? <Sparkles size={12} /> : <CheckCircle2 size={12} />} {t(key, { n })}
    </p>
  );
}

export function SkillSetDetail({
  skillSet,
  uploading,
  deletingFile,
  onUpload,
  onDeleteFile,
  onDeleteSkillSet,
  onRecompile,
  recompiling = false,
}: {
  skillSet: SkillSet;
  uploading: boolean;
  deletingFile: string | null;
  onUpload: (file: File) => void;
  onDeleteFile: (filename: string) => void;
  onDeleteSkillSet: () => void;
  onRecompile?: () => void;
  recompiling?: boolean;
}) {
  const { t } = useI18n();
  const sourceText = (s?: string) =>
    s === "table" ? t("skills.from_table") : s === "data" ? t("skills.from_data") : t("skills.from_question");
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{skillSet.name}</h2>
          {skillSet.description && <p className="mt-1 text-sm text-slate-500">{skillSet.description}</p>}
          <p className="mt-2 text-xs text-slate-400">{t("skills.files_and_formulas", { files: skillSet.file_count, formulas: skillSet.skills_count })}</p>
        </div>
        <Button variant="ghost" onClick={onDeleteSkillSet} className="text-rose-600 hover:bg-rose-50">
          <Trash2 size={15} /> {t("skills.delete_set")}
        </Button>
      </div>

      <DocDropzone onFileSelected={onUpload} disabled={uploading || recompiling} acceptedExt={[".md"]} />
      {(uploading || recompiling) && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={14} className="animate-spin" /> {t("skills.uploading")}
        </p>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">{t("skills.files_title")}</p>
          {onRecompile && !!skillSet.files?.length && (
            <Button variant="secondary" onClick={onRecompile} disabled={recompiling || uploading}>
              {recompiling ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} {t("skills.recompile")}
            </Button>
          )}
        </div>
        {!skillSet.files || skillSet.files.length === 0 ? (
          <p className="text-sm text-slate-400">{t("skills.no_files")}</p>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {skillSet.files.map((f) => (
              <div key={f.name} className="flex items-start justify-between gap-3 px-3.5 py-2.5 text-sm">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText size={15} className="shrink-0 text-slate-400" />
                    <span className="truncate">{f.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{formatSize(f.size)}</span>
                  </div>
                  <FileStatus f={f} />
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteFile(f.name)}
                  disabled={deletingFile === f.name}
                  className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  aria-label={t("skills.delete_file", { name: f.name })}
                >
                  {deletingFile === f.name ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Sigma size={14} /> {t("skills.formulas_title", { n: skillSet.skills?.length ?? 0 })}
        </p>
        {!skillSet.skills || skillSet.skills.length === 0 ? (
          <p className="text-sm text-slate-400">{t("skills.no_formulas")}</p>
        ) : (
          <div className="flex max-h-[28rem] flex-col divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
            {skillSet.skills.map((s, i) => (
              <div key={i} className="px-3.5 py-2.5 text-sm">
                <p className="font-medium text-slate-800">{s.name}</p>
                {s.formula && <p className="mt-0.5 break-all font-mono text-xs text-slate-500">{s.formula}</p>}
                {!!s.variables?.length && (
                  <ul className="mt-1.5 flex flex-col gap-0.5 text-xs text-slate-500">
                    {s.variables.map((v) => (
                      <li key={v.name}>
                        <span className="font-mono text-slate-700">{v.name}</span>
                        {v.label ? ` — ${v.label}` : ""}
                        {v.unit ? ` (${v.unit})` : ""}
                        <span className="text-slate-400"> · {sourceText(v.source)}</span>
                        {!!v.options?.length && (
                          <span className="text-slate-400">
                            {" "}
                            · {t("skills.options")}: {v.options.join(", ")}
                          </span>
                        )}
                      </li>
                    ))}
                    {s.result?.label && (
                      <li className="text-slate-600">
                        → {t("skills.result")}: {s.result.label}
                        {s.result.unit ? ` (${s.result.unit})` : ""}
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
