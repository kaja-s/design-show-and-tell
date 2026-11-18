"use client";

// ---------------------------------------------------------------------------
// /village/join: the qr code on the slide lands here. Kept short on purpose:
// you (name, email) → look → role (+ optional line and link) → done.
// The phone keeps an edit token (lib/me.ts), so coming back offers "edit me".
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import FeatherIcon from "feather-icons-react";
import { Arc } from "loading-dev";
import { PaintButton } from "../../components/paint-button";
import { EMAIL_RE, EmailSuggestion, FIELD_CLASS, FieldError, FieldLabel, suggestEmail } from "../../components/form-field";
import { signalWolfReady } from "../../components/shader-canvas";
import { Preview } from "../lib/preview";
import { clearMe, readMe, writeMe } from "../lib/me";
import {
  COLORS, HAIR_COLORS, MAX_INTRO, MAX_TAGS, OPTIONS, PANTS, SKIN, TAGS, looksLikeUrl, randomConfig,
  type Config, type FieldErrors, type Villager,
} from "../lib/villager";

type Step = 0 | 1 | 2 | 3 | 4;
type Row = { type: "chips" | "swatches"; key: keyof Config; list: readonly string[]; label: string; hideWhen?: (c: Config) => boolean };
const needsAccent = (c: Config) => c.hat !== "none" || ["headphones", "clip", "scarf"].includes(c.extra);
const TABS: { id: string; label: string; rows: Row[] }[] = [
  { id: "hair", label: "hair", rows: [
    { type: "chips", key: "hair", list: OPTIONS.hair, label: "style" },
    { type: "swatches", key: "hairColor", list: HAIR_COLORS, label: "colour", hideWhen: (c) => c.hair === "none" },
  ] },
  { id: "skin", label: "skin", rows: [{ type: "swatches", key: "skin", list: SKIN, label: "skin" }] },
  { id: "clothes", label: "clothes", rows: [
    { type: "chips", key: "top", list: OPTIONS.top, label: "top" },
    { type: "swatches", key: "topColor", list: COLORS, label: "colour" },
    { type: "swatches", key: "pants", list: PANTS, label: "trousers" },
  ] },
  { id: "extras", label: "extras", rows: [
    { type: "chips", key: "hat", list: OPTIONS.hat, label: "hat" },
    { type: "chips", key: "extra", list: OPTIONS.extra, label: "extra" },
    { type: "swatches", key: "accent", list: COLORS, label: "colour", hideWhen: (c) => !needsAccent(c) },
    { type: "chips", key: "carry", list: OPTIONS.carry, label: "holding" },
    { type: "chips", key: "pet", list: OPTIONS.pet, label: "pet" },
  ] },
  { id: "hello", label: "hello", rows: [{ type: "chips", key: "emote", list: OPTIONS.emote, label: "hello" }] },
];
const CHIP =
  "border border-foreground/20 px-2.5 py-1.5 text-xs transition-[scale,background-color,color,border-color] duration-150 ease-out active:scale-[0.97] aria-pressed:bg-highlight aria-pressed:text-highlight-text aria-pressed:border-highlight";
const STEPS = ["you", "look", "role"];

function PreviewCanvas({ config, emote, loop, className }: { config: Config; emote?: number; loop?: boolean; className: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const preview = useRef<Preview | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const p = new Preview(ref.current);
    preview.current = p;
    return () => p.dispose();
  }, []);
  useEffect(() => preview.current?.setConfig(config), [config]);
  useEffect(() => {
    if (preview.current) preview.current.loopEmote = !!loop;
  }, [loop]);
  useEffect(() => {
    if (emote) preview.current?.playEmote(config.emote);
    // only replay when asked to, not on every outfit change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emote]);
  return <canvas ref={ref} className={`block w-full touch-pan-y cursor-pointer ${className}`} aria-label="your character. tap to turn around." />;
}

export function JoinFlow() {
  const [step, setStep] = useState<Step>(1);
  const [config, setConfig] = useState<Config>(() => randomConfig());
  const [tab, setTab] = useState("hair");
  const [emoteTick, setEmoteTick] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // the address we already offered a typo fix for; sending it again keeps it
  const [suggestion, setSuggestion] = useState<{ for: string; fix: string } | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [intro, setIntro] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [errors, setErrors] = useState<FieldErrors & { form?: string }>({});
  const [sending, setSending] = useState(false);
  const [mine, setMine] = useState<Villager | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // If this phone already moved in, start from that character.
  useEffect(() => {
    signalWolfReady();
    const me = readMe();
    if (!me) return;
    fetch(`/api/villagers/${me.id}`, { cache: "no-store", headers: { "x-edit-token": me.token } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(({ villager: v, email: e }: { villager: Villager; email?: string }) => {
        setMine(v);
        setEmail(e ?? "");
        setConfig(v.config);
        setName(v.name);
        setTags(v.tags);
        setIntro(v.intro);
        setPortfolio(v.portfolio);
        setLinkedin(v.linkedin);
        setStep(0);
      })
      .catch((status) => {
        if (status === 404) clearMe();
      });
  }, []);

  const set = <K extends keyof Config>(key: K, value: Config[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
    if (key === "emote") setEmoteTick((t) => t + 1);
  };
  const go = (s: Step) => {
    setStep(s);
    window.scrollTo(0, 0);
  };

  const nextFromYou = () => {
    const errs: FieldErrors = {};
    const mail = email.trim();
    if (!name.trim()) errs.name = "add your name.";
    if (!mail) errs.email = "add your email.";
    else if (!EMAIL_RE.test(mail)) errs.email = "try name@example.com.";
    else {
      const fix = suggestEmail(mail);
      if (fix && suggestion?.for !== mail) {
        setSuggestion({ for: mail, fix });
        errs.email = "suggest";
      }
    }
    setErrors(errs);
    if (errs.name) return document.getElementById("f-name")?.focus();
    if (errs.email) return document.getElementById("f-email")?.focus();
    go(2);
  };

  const toggleTag = (t: string) => {
    if (tags.includes(t)) setTags(tags.filter((x) => x !== t));
    else if (tags.length >= MAX_TAGS) return setErrors((e) => ({ ...e, tags: `${MAX_TAGS} at most.` }));
    else setTags([...tags, t]);
    setErrors((e) => ({ ...e, tags: undefined }));
  };

  const addCustomTag = () => {
    const t = customTag.trim().toLowerCase();
    if (!t) return;
    if (t.length > 24) return setErrors((e) => ({ ...e, tags: "keep it under 24 characters." }));
    if (!tags.includes(t)) {
      if (tags.length >= MAX_TAGS) return setErrors((e) => ({ ...e, tags: `${MAX_TAGS} at most.` }));
      setTags([...tags, t]);
    }
    setCustomTag("");
    setErrors((e) => ({ ...e, tags: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    // a role typed but not added yet still counts
    const typed = customTag.trim().toLowerCase();
    const roles = typed && !tags.includes(typed) && tags.length < MAX_TAGS ? [...tags, typed] : tags;
    if (!roles.length) errs.tags = "pick or write at least one.";
    if (portfolio.trim() && !looksLikeUrl(portfolio)) errs.portfolio = "that doesn't look like a link.";
    if (linkedin.trim().length > 200) errs.linkedin = "that link is too long.";
    setErrors(errs);
    if (errs.tags) return document.getElementById("tag-0")?.focus();
    if (errs.portfolio) return document.getElementById("f-portfolio")?.focus();
    if (errs.linkedin) return document.getElementById("f-linkedin")?.focus();

    setSending(true);
    if (typed) {
      setTags(roles);
      setCustomTag("");
    }
    // twitter isn't asked anymore; keep whatever an older card had
    const body = { name, email: email.trim(), tags: roles, intro, portfolio, linkedin, twitter: mine?.twitter ?? "", config };
    try {
      const me = readMe();
      let res = me && mine
        ? await fetch(`/api/villagers/${me.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-edit-token": me.token }, body: JSON.stringify(body) })
        : null;
      if (!res || res.status === 404 || res.status === 403) {
        res = await fetch("/api/villagers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // name/email problems live on the first step
        if (data.errors?.name || data.errors?.email) {
          setErrors({ ...(data.errors ?? {}) });
          go(1);
          return;
        }
        setErrors({ ...(data.errors ?? {}), form: data.error ?? "something went wrong. try again." });
        return;
      }
      if (data.token) writeMe({ id: data.villager.id, token: data.token });
      setMine(data.villager);
      setEmoteTick((t) => t + 1);
      go(4);
    } catch {
      setErrors({ form: "couldn't reach the village. check your connection and try again." });
    } finally {
      setSending(false);
    }
  };

  const remove = async () => {
    const me = readMe();
    if (!me) return;
    setSending(true);
    try {
      const res = await fetch(`/api/villagers/${me.id}`, { method: "DELETE", headers: { "x-edit-token": me.token } });
      if (!res.ok) throw new Error();
      clearMe();
      setMine(null);
      setConfirmRemove(false);
      setName("");
      setEmail("");
      setTags([]);
      setIntro("");
      setPortfolio("");
      setLinkedin("");
      setCustomTag("");
      setConfig(randomConfig());
      go(1);
    } catch {
      setErrors({ form: "couldn't remove you right now. try again in a moment." });
    } finally {
      setSending(false);
    }
  };

  const current = TABS.find((t) => t.id === tab)!;

  return (
    <main className="mx-auto w-full max-w-sm min-h-dvh flex flex-col px-5 pt-6 pb-8 gap-4">
      {step > 0 && step < 4 && (
        <ol className="grid grid-cols-3 gap-1.5" aria-label="steps">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={step === i + 1 ? "step" : undefined} className={`flex gap-1.5 text-[11px] pt-1.5 border-t-2 transition-[border-color,opacity] duration-200 ${step >= i + 1 ? "border-foreground" : "border-foreground/15 opacity-50"}`}>
              <span className="tabular-nums opacity-60">{i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      )}

      {step === 0 && mine && (
        <section key="s0" className="village-step flex-1 flex flex-col gap-5">
          <PreviewCanvas config={config} loop className="h-[300px] -mx-5" />
          <h1 className="text-2xl font-medium leading-tight tracking-tight">hi again, {mine.name}</h1>
          <div className="flex-1" />
          <div className="flex flex-col items-center gap-4">
            <PaintButton className="w-full py-3 text-center" onClick={() => go(2)}>edit me</PaintButton>
            <Link href={`/village?me=${mine.id}`} className="text-sm underline underline-offset-2 hover:bg-highlight hover:text-highlight-text hover:no-underline">
              visit the village
            </Link>
          </div>
        </section>
      )}

      {step === 1 && (
        <section key="s1" className="village-step flex-1 flex flex-col gap-5">
          <h1 className="text-2xl font-medium leading-tight tracking-tight">move into the village</h1>
          <div>
            <FieldLabel htmlFor="f-name">name</FieldLabel>
            <input
              id="f-name"
              autoComplete="given-name"
              maxLength={40}
              placeholder="kaja"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby="e-name"
              className={`${FIELD_CLASS} text-base`}
            />
            <FieldError id="e-name">{errors.name}</FieldError>
          </div>
          <div>
            <FieldLabel htmlFor="f-email">email · private</FieldLabel>
            <input
              id="f-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && nextFromYou()}
              placeholder="name@example.com"
              aria-invalid={!!errors.email}
              aria-describedby="e-email"
              className={`${FIELD_CLASS} text-base`}
            />
            <FieldError id="e-email">
              {errors.email === "suggest" && suggestion ? (
                <EmailSuggestion
                  suggestion={suggestion.fix}
                  onAccept={() => {
                    setEmail(suggestion.fix);
                    setSuggestion(null);
                    setErrors((e) => ({ ...e, email: undefined }));
                  }}
                />
              ) : (
                errors.email
              )}
            </FieldError>
          </div>
          <div className="flex-1" />
          <PaintButton onClick={nextFromYou} className="w-full py-3 text-center">
            next
          </PaintButton>
        </section>
      )}

      {step === 2 && (
        <section key="s2" className="village-step flex-1 flex flex-col gap-4">
          <div className="relative -mx-5">
            <PreviewCanvas config={config} emote={emoteTick} className="h-[260px]" />
            <button
              type="button"
              aria-label="shuffle"
              title="shuffle"
              onClick={() => setConfig((c) => ({ ...randomConfig(), emote: c.emote }))}
              className="absolute right-5 bottom-2 size-9 grid place-items-center border border-foreground/20 bg-background/80 transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.95] hover:bg-highlight hover:text-highlight-text"
            >
              <FeatherIcon icon="shuffle" size={15} />
            </button>
          </div>
          <div className="flex gap-5 overflow-x-auto -mx-5 px-5 border-b border-foreground/10 [scrollbar-width:none]" role="tablist" aria-label="customise">
            {TABS.map((t) => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls="look-panel"
                onClick={() => setTab(t.id)}
                className="shrink-0 -mb-px py-2 text-sm border-b-2 border-transparent opacity-50 transition-[opacity,border-color] duration-150 hover:opacity-80 aria-selected:opacity-100 aria-selected:border-foreground"
              >
                {t.label}
              </button>
            ))}
          </div>
          <div id="look-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex flex-col gap-3 min-h-[96px]">
            {current.rows
              .filter((r) => !r.hideWhen?.(config))
              .map((r) => (
                <div key={r.key} className="flex items-center gap-2.5 overflow-x-auto -mx-5 px-5 py-1 [scrollbar-width:none]" role="group" aria-label={r.label}>
                  {current.rows.length > 1 && <span className="shrink-0 w-14 text-xs opacity-60">{r.label}</span>}
                  {r.list.map((v) =>
                    r.type === "chips" ? (
                      <button key={v} type="button" aria-pressed={config[r.key] === v} onClick={() => set(r.key, v as never)} className={`shrink-0 ${CHIP}`}>
                        {v}
                      </button>
                    ) : (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={config[r.key] === v}
                        aria-label={v}
                        onClick={() => set(r.key, v as never)}
                        className="shrink-0 size-8 rounded-full border border-foreground/20 transition-[scale] duration-150 ease-out active:scale-[0.92] aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-foreground aria-pressed:outline"
                        style={{ background: v }}
                      />
                    ),
                  )}
                </div>
              ))}
          </div>
          <div className="flex-1" />
          <Nav onBack={() => go(mine ? 0 : 1)} onNext={() => go(3)} />
        </section>
      )}

      {step === 3 && (
        <form key="s3" noValidate onSubmit={submit} className="village-step flex-1 flex flex-col gap-5">
          <fieldset aria-describedby="e-tags">
            <legend className="text-2xl font-medium leading-tight tracking-tight mb-4">what do you do?</legend>
            <div className="flex flex-wrap gap-1.5">
              {[...TAGS, ...tags.filter((t) => !TAGS.includes(t))].map((t, i) => (
                <button key={t} id={`tag-${i}`} type="button" aria-pressed={tags.includes(t)} onClick={() => toggleTag(t)} className={CHIP}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2.5">
              <label htmlFor="f-tag" className="sr-only">
                write your own role
              </label>
              <input
                id="f-tag"
                value={customTag}
                maxLength={24}
                autoCapitalize="none"
                placeholder="+ write your own"
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                className={`${FIELD_CLASS} text-base py-2`}
              />
              <button type="button" onClick={addCustomTag} disabled={!customTag.trim()} className="text-sm underline underline-offset-2 hover:opacity-70 disabled:opacity-40 disabled:no-underline">
                add
              </button>
            </div>
            <FieldError id="e-tags">{errors.tags}</FieldError>
          </fieldset>

          <div>
            <FieldLabel htmlFor="f-intro">short bio · optional</FieldLabel>
            <textarea
              id="f-intro"
              rows={3}
              maxLength={MAX_INTRO}
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="what you work on, what you're into"
              aria-invalid={!!errors.intro}
              aria-describedby="c-intro e-intro"
              className={`${FIELD_CLASS} text-base resize-none`}
            />
            <span id="c-intro" className="block text-right text-[11px] opacity-50 tabular-nums">
              {MAX_INTRO - intro.length}
            </span>
            <FieldError id="e-intro">{errors.intro}</FieldError>
          </div>

          <div>
            <FieldLabel htmlFor="f-portfolio">portfolio · optional</FieldLabel>
            <input id="f-portfolio" inputMode="url" autoComplete="url" autoCapitalize="none" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="yourname.com" aria-invalid={!!errors.portfolio} aria-describedby="e-portfolio" className={`${FIELD_CLASS} text-base`} />
            <FieldError id="e-portfolio">{errors.portfolio}</FieldError>
          </div>

          <div>
            <FieldLabel htmlFor="f-linkedin">linkedin · optional</FieldLabel>
            <input id="f-linkedin" inputMode="url" autoCapitalize="none" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/yourname" aria-invalid={!!errors.linkedin} aria-describedby="e-linkedin" className={`${FIELD_CLASS} text-base`} />
            <FieldError id="e-linkedin">{errors.linkedin}</FieldError>
          </div>

          {errors.form && (
            <p role="alert" className="text-xs text-danger">
              {errors.form}
            </p>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-5">
            <button type="button" className="text-sm underline underline-offset-2 hover:opacity-70" onClick={() => go(2)}>
              back
            </button>
            <PaintButton type="submit" disabled={sending} className="flex-1 py-3 text-center">
              {sending ? (
                <span className="inline-flex items-center gap-2">
                  <Arc size={12} />
                  moving in
                </span>
              ) : mine ? (
                "save"
              ) : (
                "move in"
              )}
            </PaintButton>
          </div>
        </form>
      )}

      {step === 4 && mine && (
        <section key="s4" className="village-step flex-1 flex flex-col gap-3.5">
          <PreviewCanvas config={config} emote={emoteTick} loop className="h-[300px] -mx-5" />
          <h1 className="text-2xl font-medium leading-tight tracking-tight">you&apos;re in, {mine.name}.</h1>
          <div className="flex-1" />
          <PaintButton className="w-full py-3 text-center" onClick={() => window.location.assign(`/village?me=${mine.id}`)}>visit the village</PaintButton>
          <div className="flex justify-center flex-wrap gap-x-5 gap-y-2 text-sm">
            <button type="button" className="underline underline-offset-2 hover:opacity-70" onClick={() => go(2)}>
              edit
            </button>
            {confirmRemove ? (
              <span className="flex gap-3 items-center">
                remove you?
                <button type="button" className="underline underline-offset-2 text-danger" onClick={remove} disabled={sending}>
                  remove
                </button>
                <button type="button" className="underline underline-offset-2 hover:opacity-70" onClick={() => setConfirmRemove(false)}>
                  cancel
                </button>
              </span>
            ) : (
              <button type="button" className="underline underline-offset-2 opacity-60 hover:opacity-100" onClick={() => setConfirmRemove(true)}>
                remove me
              </button>
            )}
          </div>
          {errors.form && (
            <p role="alert" className="text-xs text-danger">
              {errors.form}
            </p>
          )}
        </section>
      )}
    </main>
  );
}

function Nav({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center gap-5">
      <button type="button" className="text-sm underline underline-offset-2 hover:opacity-70" onClick={onBack}>
        back
      </button>
      <PaintButton onClick={onNext} className="flex-1 py-3 text-center">
        next
      </PaintButton>
    </div>
  );
}
