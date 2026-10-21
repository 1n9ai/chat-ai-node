"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { CheckCircle2, KeyRound, Loader2, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { finishSetup, getSetup, saveLicenseKey, setupAi, setupPassword, startTrial, discoverModels, type DiscoveredModel, type SetupEndpoint, type SetupStatus } from "@/lib/api";
import { I18nProvider, LOCALES, errorText, useI18n, type Locale } from "@/lib/i18n";
import { AppMark } from "@/components/ui/AppMark";

const STEPS = ["license", "ai", "password"] as const;
type Step = (typeof STEPS)[number] | "finish";

export default function SetupPage() {
  return (
    <I18nProvider>
      <Wizard />
    </I18nProvider>
  );
}

function Wizard() {
  const { t, locale, setLocale } = useI18n();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [step, setStep] = useState<Step>("license");

  useEffect(() => {
    getSetup()
      .then((s) => {
        setStatus(s);
        setStep(!s.has_license ? "license" : !(s.has_llm && s.has_embedding) ? "ai" : "password");
      })
      .catch(() => setStatus(null));
  }, []);

  const index = step === "finish" ? STEPS.length : STEPS.indexOf(step);
  const go = (s: Step) => setStep(s);

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col gap-6 px-4 py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <AppMark size={40} />
          <div>
            <h1 className="text-xl font-semibold text-accent-900">{t("setup.title")}</h1>
            <p className="text-sm text-accent-500">{t("setup.subtitle")}</p>
          </div>
        </div>
        <select
          aria-label={t("setup.language")}
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className="field !w-auto py-1.5 text-xs"
        >
          {LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </header>

      {step !== "finish" && (
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-1.5">
            {STEPS.map((s, i) => (
              <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-brand-grad" : "bg-accent-200"}`} />
            ))}
          </div>
          <span className="text-xs text-accent-500">{t("setup.step", { n: index + 1, total: STEPS.length })}</span>
        </div>
      )}

      {!status ? (
        <Loader2 className="mx-auto animate-spin text-accent-400" />
      ) : step === "license" ? (
        <LicenseStep status={status} onDone={(s) => (setStatus(s), go("ai"))} />
      ) : step === "ai" ? (
        <AiStep status={status} onBack={() => go("license")} onDone={(s) => (setStatus(s), go("password"))} />
      ) : step === "password" ? (
        <PasswordStep status={status} onBack={() => go("ai")} onDone={() => go("finish")} />
      ) : (
        <FinishStep />
      )}
    </main>
  );
}

function Card({ icon, title, desc, children }: { icon: ReactNode; title: string; desc: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-float ring-1 ring-accent-100">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">{icon}</span>
        <div>
          <h2 className="text-base font-semibold text-accent-900">{title}</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-accent-500">{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Ready({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700">
      <CheckCircle2 size={16} /> {text}
    </p>
  );
}

function ErrorLine({ text }: { text: string | null }) {
  return text ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{text}</p> : null;
}

function useAction<T>() {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run(fn: () => Promise<T>, then: (v: T) => void) {
    setBusy(true);
    setErr(null);
    try {
      then(await fn());
    } catch (e) {
      setErr(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }
  return { busy, err, run };
}

function LicenseStep({ status, onDone }: { status: SetupStatus; onDone: (s: SetupStatus) => void }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"trial" | "key">("trial");
  const [email, setEmail] = useState("");
  const [key, setKey] = useState("");
  const { busy, err, run } = useAction<SetupStatus>();
  // ช่วง Free Beta เปิดรับ = แจก license beta, ปิดรับแล้ว = ทดลอง N ชั่วโมง (central บอกมา)
  const beta = status.program ? status.program.signup_open : true;
  const desc = beta ? t("setup.license.beta_desc") : t("setup.license.trial_desc", { hours: status.program?.trial_hours ?? 24 });

  return (
    <Card icon={<Sparkles size={18} />} title={t("setup.license.title")} desc={desc}>
      {status.has_license ? (
        <Ready text={t("setup.license.ready")} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-accent-100 p-1 text-sm">
            {(["trial", "key"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`rounded-lg py-2 font-medium transition ${tab === k ? "bg-white text-accent-900 shadow-soft" : "text-accent-500"}`}
              >
                {t(k === "key" ? "setup.license.tab_key" : beta ? "setup.license.tab_beta" : "setup.license.tab_trial")}
              </button>
            ))}
          </div>
          {tab === "trial" ? (
            <label className="flex flex-col gap-1.5">
              <span className="field-label">{t("setup.license.email")}</span>
              <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              <span className="text-xs text-accent-400">{t("setup.license.email_hint")}</span>
            </label>
          ) : (
            <label className="flex flex-col gap-1.5">
              <span className="field-label">{t("setup.license.key")}</span>
              <input className="field font-mono text-[13px]" value={key} onChange={(e) => setKey(e.target.value)} spellCheck={false} />
              <span className="text-xs text-accent-400">{t("setup.license.key_hint")}</span>
            </label>
          )}
          <ErrorLine text={err} />
        </>
      )}
      <div className="flex justify-end">
        {status.has_license ? (
          <Button onClick={() => onDone(status)}>{t("setup.next")}</Button>
        ) : (
          <Button
            disabled={busy || (tab === "trial" ? !email.includes("@") : !key.trim())}
            onClick={() => run(() => (tab === "trial" ? startTrial(email.trim()) : saveLicenseKey(key.trim())), onDone)}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {t(tab === "key" ? "setup.license.save_key" : beta ? "setup.license.start_beta" : "setup.license.start_trial")}
          </Button>
        )}
      </div>
    </Card>
  );
}

type Endpoint = SetupEndpoint;
type Kind = "llm" | "embedding" | "rerank";
type Found = { models: DiscoveredModel[]; err: string | null; busy: boolean; key: string };
const EMPTY: Endpoint = { base_url: "", api_key: "", model: "" };
const NO_FOUND: Found = { models: [], err: null, busy: false, key: "" };
const trimmed = (e: Endpoint): Endpoint => ({ base_url: e.base_url.trim(), api_key: e.api_key.trim(), model: e.model.trim() });
const endpointKey = (e: Endpoint) => `${e.base_url.trim()}|${e.api_key.trim()}`;

// ไม่มีผู้ให้บริการหรือโมเดลตั้งไว้ให้ — ผู้ใช้ใส่ URL (ถ้ามี) + key แล้วระบบดึงรายชื่อโมเดลจากผู้ให้บริการมาให้เลือก
function useDiscovery() {
  const { t } = useI18n();
  const [found, setFound] = useState<Found>(NO_FOUND);
  const discover = async (e: Endpoint) => {
    if (!e.api_key.trim() && !e.base_url.trim()) return;
    const key = endpointKey(e);
    setFound((f) => ({ ...f, busy: true, err: null, key }));
    try {
      const r = await discoverModels({ base_url: e.base_url.trim(), api_key: e.api_key.trim() });
      setFound({ models: r.models, err: r.models.length ? null : t("setup.ai.none_found"), busy: false, key });
    } catch (err) {
      setFound({ models: [], err: errorText(t, err), busy: false, key });
    }
  };
  return { found, discover };
}

function AiStep({ status, onBack, onDone }: { status: SetupStatus; onBack: () => void; onDone: (s: SetupStatus) => void }) {
  const { t } = useI18n();
  const [llm, setLlm] = useState<Endpoint>(EMPTY);
  const [emb, setEmb] = useState<Endpoint>(EMPTY);
  const [embSame, setEmbSame] = useState(true);
  const [useRerank, setUseRerank] = useState(false);
  const [rr, setRr] = useState<Endpoint>(EMPTY);
  const llmD = useDiscovery();
  const embD = useDiscovery();
  const rrD = useDiscovery();
  const { busy, err, run } = useAction<SetupStatus>();
  const ready = status.has_llm && status.has_embedding;
  const embEff: Endpoint = embSame ? { ...llm, model: emb.model } : emb;
  const ok = (e: Endpoint) => !!(e.model.trim() && (e.api_key.trim() || e.base_url.trim()));
  const canSave = ok(llm) && ok(embEff) && (!useRerank || ok(rr));

  return (
    <Card icon={<KeyRound size={18} />} title={t("setup.ai.title")} desc={t("setup.ai.desc")}>
      {ready && <Ready text={t("setup.ai.ready")} />}
      <EndpointFields kind="llm" title={t("setup.ai.llm_title")} desc={t("setup.ai.llm_desc")} value={llm} onChange={setLlm} d={llmD} />
      <div className="flex flex-col gap-3">
        <EndpointFields
          kind="embedding"
          title={t("setup.ai.emb_title")}
          desc={t("setup.ai.emb_desc")}
          value={embEff}
          onChange={(v) => setEmb(embSame ? { ...emb, model: v.model } : v)}
          d={embSame ? llmD : embD}
          modelOnly={embSame}
        />
        <label className="flex items-center gap-2 text-sm text-accent-700">
          <input type="checkbox" checked={embSame} onChange={(e) => setEmbSame(e.target.checked)} />
          {t("setup.ai.same_as_llm")}
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm text-accent-700">
        <input type="checkbox" checked={useRerank} onChange={(e) => setUseRerank(e.target.checked)} />
        {t("setup.ai.rerank_toggle")}
      </label>
      {useRerank && (
        <EndpointFields kind="rerank" title={t("setup.ai.rerank_title")} desc={t("setup.ai.rerank_desc")} value={rr} onChange={setRr} d={rrD} />
      )}
      <p className="text-xs leading-relaxed text-accent-400">{t("setup.ai.where_note")}</p>
      <p className="text-xs leading-relaxed text-accent-400">{t("setup.ai.privacy_note")}</p>
      <ErrorLine text={err} />
      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          {t("setup.back")}
        </Button>
        <div className="flex gap-2">
          {ready && (
            <Button variant="secondary" onClick={() => onDone(status)}>
              {t("setup.next")}
            </Button>
          )}
          <Button
            disabled={busy || !canSave}
            onClick={() =>
              run(() => setupAi({ llm: trimmed(llm), embedding: trimmed(embEff), ...(useRerank ? { rerank: trimmed(rr) } : {}) }), onDone)
            }
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {t(busy ? "setup.ai.verifying" : "setup.ai.verify")}
          </Button>
        </div>
      </div>
    </Card>
  );
}

const OTHER = "__other__";

function EndpointFields({ kind, title, desc, value, onChange, d, modelOnly = false }: {
  kind: Kind;
  title: string;
  desc: string;
  value: Endpoint;
  onChange: (v: Endpoint) => void;
  d: ReturnType<typeof useDiscovery>;
  modelOnly?: boolean;
}) {
  const { t } = useI18n();
  const [typing, setTyping] = useState(false);
  const set = (k: keyof Endpoint) => (e: ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  const options = d.found.models.filter((m) => m.kinds.includes(kind));
  const stale = d.found.key !== endpointKey(value);
  const autoDiscover = () => {
    if (!modelOnly && stale && (value.api_key.trim() || value.base_url.trim())) d.discover(value);
  };
  const showSelect = options.length > 0 && !typing;
  return (
    <fieldset className="flex flex-col gap-2.5 rounded-xl p-3 ring-1 ring-inset ring-accent-200">
      <div>
        <p className="text-sm font-semibold text-accent-900">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-accent-500">{desc}</p>
      </div>
      {!modelOnly && (
        <>
          <label className="flex flex-col gap-1.5">
            <span className="field-label">{t("setup.ai.base_url")}</span>
            <input
              className="field font-mono text-[13px]"
              autoComplete="off"
              placeholder="https://"
              value={value.base_url}
              onChange={set("base_url")}
              onBlur={autoDiscover}
            />
            <span className="text-[11px] text-accent-400">{t("setup.ai.base_url_hint")}</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="field-label">{t("setup.ai.api_key")}</span>
            <input
              className="field font-mono text-[13px]"
              type="password"
              autoComplete="off"
              value={value.api_key}
              onChange={set("api_key")}
              onBlur={autoDiscover}
            />
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              disabled={d.found.busy || (!value.api_key.trim() && !value.base_url.trim())}
              onClick={() => d.discover(value)}
            >
              {d.found.busy && <Loader2 size={14} className="animate-spin" />}
              {t("setup.ai.discover")}
            </Button>
            {!d.found.busy && !stale && d.found.models.length > 0 && (
              <span className="text-xs text-accent-500">{t("setup.ai.found_n", { n: options.length })}</span>
            )}
          </div>
        </>
      )}
      {(modelOnly || !stale) && d.found.err && <p className="text-xs text-rose-600">{d.found.err}</p>}
      {modelOnly && d.found.models.length > 0 && options.length === 0 && (
        <p className="text-xs text-amber-700">{t("setup.ai.no_embedding_here")}</p>
      )}
      <label className="flex flex-col gap-1.5">
        <span className="field-label">{t("setup.ai.model")}</span>
        {showSelect ? (
          <select
            className="field text-[13px]"
            value={options.some((m) => m.id === value.model) ? value.model : ""}
            onChange={(e) => (e.target.value === OTHER ? setTyping(true) : onChange({ ...value, model: e.target.value }))}
          >
            <option value="" disabled>
              {t("setup.ai.pick_model")}
            </option>
            {options.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))}
            <option value={OTHER}>{t("setup.ai.type_model")}</option>
          </select>
        ) : (
          <input
            className="field font-mono text-[13px]"
            autoComplete="off"
            value={value.model}
            onChange={set("model")}
            placeholder={modelOnly && !d.found.models.length ? t("setup.ai.discover_first") : ""}
          />
        )}
      </label>
    </fieldset>
  );
}

function PasswordStep({ status, onBack, onDone }: { status: SetupStatus; onBack: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const { busy, err, run } = useAction<SetupStatus>();
  const done = status.has_password;
  const ok = pw.length >= 8 && pw === pw2;

  return (
    <Card icon={<Lock size={18} />} title={t("setup.password.title")} desc={t("setup.password.desc")}>
      {status.password_from_env ? (
        <Ready text={t("setup.password.from_env")} />
      ) : done ? (
        <Ready text={t("setup.password.ready")} />
      ) : (
        <>
          <p className="text-sm text-accent-600">{t("setup.password.user", { user: status.admin_user })}</p>
          <label className="flex flex-col gap-1.5">
            <span className="field-label">{t("setup.password.password")}</span>
            <input className="field" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="field-label">{t("setup.password.confirm")}</span>
            <input className="field" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            {pw2 && pw !== pw2 && <span className="text-xs text-rose-600">{t("setup.password.mismatch")}</span>}
            <span className="text-xs text-accent-400">{t("setup.password.login_note")}</span>
          </label>
          <ErrorLine text={err} />
        </>
      )}
      <div className="flex justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          {t("setup.back")}
        </Button>
        {done || status.password_from_env ? (
          <Button onClick={onDone}>{t("setup.next")}</Button>
        ) : (
          <Button disabled={busy || !ok} onClick={() => run(() => setupPassword(pw), onDone)}>
            {busy && <Loader2 size={15} className="animate-spin" />}
            {t("setup.password.save")}
          </Button>
        )}
      </div>
    </Card>
  );
}

function FinishStep() {
  const { t } = useI18n();
  useEffect(() => {
    finishSetup().catch(() => undefined);
  }, []);
  return (
    <Card icon={<CheckCircle2 size={18} />} title={t("setup.finish.title")} desc={t("setup.finish.desc")}>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={() => (window.location.href = "/admin/")}>
          {t("setup.finish.go_admin")}
        </Button>
        <Button onClick={() => (window.location.href = "/kb/")}>{t("setup.finish.go_kb")}</Button>
      </div>
    </Card>
  );
}
