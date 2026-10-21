"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { AppMark } from "@/components/ui/AppMark";
import { Button } from "@/components/ui/Button";
import { login } from "@/lib/api";
import { I18nProvider, LOCALES, errorText, useI18n, type Locale } from "@/lib/i18n";

export default function LoginPage() {
  return (
    <I18nProvider>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </I18nProvider>
  );
}

function LoginForm() {
  const { t, locale, setLocale } = useI18n();
  const params = useSearchParams();
  const [user, setUser] = useState("admin");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(user.trim(), pw);
      const next = params.get("next") || "/admin/";
      window.location.replace(next.startsWith("/") && !next.startsWith("//") ? next : "/admin/");
    } catch (err) {
      setError(errorText(t, err));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-7 flex flex-col items-center text-center">
        <AppMark size={56} />
        <h1 className="title-grad mt-4 text-2xl font-semibold tracking-tight">{t("login.app")}</h1>
        <p className="mt-1.5 text-sm text-accent-500">{t("login.subtitle")}</p>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-float ring-1 ring-accent-200/60 sm:p-7">
        <div className="flex items-center gap-2 text-sm font-semibold text-accent-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Lock size={16} />
          </span>
          {t("login.title")}
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">{t("login.user")}</span>
          <input className="field" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="field-label">{t("login.password")}</span>
          <span className="relative">
            <input className="field pr-11" type={show ? "text" : "password"} autoComplete="current-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={t(show ? "login.hide" : "login.show")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-accent-400 hover:text-accent-700"
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </span>
        </label>
        {error && <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">{error}</p>}
        <Button type="submit" disabled={busy || !pw} className="w-full">
          {busy && <Loader2 size={15} className="animate-spin" />}
          {t("login.submit")}
        </Button>
      </form>
      <div className="mt-5 flex flex-col items-center gap-3 text-center text-xs text-accent-400">
        <p>{t("login.forgot")}</p>
        <select aria-label={t("setup.language")} value={locale} onChange={(e) => setLocale(e.target.value as Locale)} className="field !w-auto py-1.5 text-xs">
          {LOCALES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
    </main>
  );
}
