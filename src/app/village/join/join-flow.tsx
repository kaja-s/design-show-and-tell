"use client";

// ---------------------------------------------------------------------------
// /village/join: the qr code on the slide lands here. Kept short on purpose:
// you (name, email) → look → role (+ optional line and link) → done.
// The phone keeps an edit token (lib/me.ts), so coming back offers "edit me".
// ---------------------------------------------------------------------------
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import FeatherIcon from "feather-icons-react";
import { Arc } from "loading-dev";
import { PaintButton } from "../../components/paint-button";
import { EMAIL_RE, EmailSuggestion, FIELD_CLASS, FieldError, FieldLabel, suggestEmail } from "../../components/form-field";
import { signalWolfReady } from "../../components/shader-canvas";
import { Preview } from "../lib/preview";
import { TrailSteps } from "./step-trail";
import { clearMe, readMe, writeMe } from "../lib/me";
import {
  COLORS, HAIR_COLORS, LINK_LABEL, MAX_INTRO, MAX_TAGS, OPTIONS, PANTS, SKIN, TAGS, defaultConfig, linkKind, randomConfig,
  type Config, type FieldErrors, type Villager,
} from "../lib/villager";

type Step = 0 | 1 | 2 | 3 | 4;
type Row = { type: "chips" | "swatches"; key: keyof Config; list: readonly string[]; label: string; hideWhen?: (c: Config) => boolean };
const needsAccent = (c: Config) => c.hat !== "none" || ["headphones", "clip", "scarf"].includes(c.extra);
const TABS: { id: string; label: string; rows: Row[] }[] = [
  { id: "skin", label: "skin", rows: [{ type: "swatches", key: "skin", list: SKIN, label: "skin" }] },
  { id: "hair", label: "hair", rows: [
    { type: "chips", key: "hair", list: OPTIONS.hair, label: "style" },
    { type: "swatches", key: "hairColor", list: HAIR_COLORS, label: "colour", hideWhen: (c) => c.hair === "none" },
  ] },
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
// .hit (globals.css) pads every small control out to a 44px tap area.
const CHIP =
  "hit relative border border-foreground/20 px-3 py-2 text-xs transition-[scale,background-color,color,border-color] duration-150 ease-out active:scale-[0.97] hover:border-foreground/50 aria-pressed:bg-highlight aria-pressed:text-highlight-text aria-pressed:border-highlight";
const SWATCH =
  "hit relative shrink-0 size-9 rounded-full border border-foreground/20 outline outline-2 outline-offset-0 outline-transparent transition-[scale,outline-offset,outline-color] duration-150 ease-out active:scale-[0.92] aria-pressed:outline-offset-2 aria-pressed:outline-foreground";
const TEXT_BUTTON = "hit relative text-sm underline underline-offset-2 transition-opacity duration-150 hover:opacity-70 active:opacity-50";
// a row of options that scrolls sideways: fades at the edges so it reads as more
const SCROLL_ROW =
  "flex items-center gap-2.5 overflow-x-auto overscroll-x-contain -mx-5 px-5 py-2 [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,#000_1.25rem,#000_calc(100%-1.25rem),transparent)]";

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
  return <canvas ref={ref} className={`block w-full touch-pan-y cursor-grab active:cursor-grabbing select-none ${className}`} aria-label="your character. tap or drag sideways to turn around." />;
}

export function JoinFlow() {
  const [step, setStep] = useState<Step>(1);
  const [config, setConfig] = useState<Config>(() => defaultConfig());
  const [tab, setTab] = useState("skin");
  const [emoteTick, setEmoteTick] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  // the address we already offered a typo fix for; sending it again keeps it
  const [suggestion, setSuggestion] = useState<{ for: string; fix: string } | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [intro, setIntro] = useState("");
  // one "links" field: people paste whatever they have and linkKind() sorts it
  // into portfolio / linkedin / x when saving (up to one of each)
  const [links, setLinks] = useState<string[]>([""]);
  const [linkErrors, setLinkErrors] = useState<(string | undefined)[]>([]);
  const [errors, setErrors] = useState<FieldErrors & { form?: string }>({});
  const [sending, setSending] = useState(false);
  const [mine, setMine] = useState<Villager | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [shuffles, setShuffles] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  // Slide the tab underline under the picked tab. Written straight to the
  // transform (no state); it lands without a slide when the step mounts.
  useLayoutEffect(() => {
    const bar = barRef.current;
    const el = tabsRef.current?.querySelector<HTMLElement>(`#tab-${tab}`);
    if (!bar || !el) return;
    bar.style.transition = bar.dataset.placed ? "" : "none";
    bar.style.transform = `translateX(${el.offsetLeft}px) scaleX(${el.offsetWidth})`;
    bar.dataset.placed = "1";
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab, step]);

  // Always light: drop .dark while the flow is open, put it back on the way out.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.remove("dark");
    return () => {
      if (wasDark) root.classList.add("dark");
    };
  }, []);

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
        const had = [v.portfolio, v.linkedin, v.twitter].filter((l) => l?.trim());
        setLinks(had.length ? had : [""]);
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
    // sort the links; one of each kind
    const sorted: Record<string, string> = { portfolio: "", linkedin: "", twitter: "" };
    const linkErrs = links.map((l) => {
      if (!l.trim()) return undefined;
      const kind = linkKind(l);
      if (!kind) return "that doesn't look like a link. paste the whole address.";
      if (sorted[kind]) return `you've already added a ${LINK_LABEL[kind]} link.`;
      sorted[kind] = l.trim();
      return undefined;
    });
    setErrors(errs);
    setLinkErrors(linkErrs);
    if (errs.tags) return document.getElementById("tag-0")?.focus();
    const bad = linkErrs.findIndex(Boolean);
    if (bad >= 0) return document.getElementById(`f-link-${bad}`)?.focus();

    setSending(true);
    if (typed) {
      setTags(roles);
      setCustomTag("");
    }
    const body = { name, email: email.trim(), tags: roles, intro, portfolio: sorted.portfolio, linkedin: sorted.linkedin, twitter: sorted.twitter, config };
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
        // a link the server didn't accept goes back on the row it came from
        const fromServer = data.errors ?? {};
        setLinkErrors(links.map((l) => {
          const kind = linkKind(l);
          return kind ? fromServer[kind] : undefined;
        }));
        setErrors({ ...fromServer, form: data.error ?? "something went wrong. try again." });
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
      setLinks([""]);
      setLinkErrors([]);
      setCustomTag("");
      setConfig(defaultConfig());
      go(1);
    } catch {
      setErrors({ form: "couldn't remove you right now. try again in a moment." });
    } finally {
      setSending(false);
    }
  };

  const current = TABS.find((t) => t.id === tab)!;

  return (
    <main className="join-flow mx-auto w-full max-w-sm min-h-dvh flex flex-col px-[max(1.25rem,env(safe-area-inset-left),env(safe-area-inset-right))] pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))] gap-4">
      {step > 0 && step < 4 && <TrailSteps step={step} config={config} />}

      {step === 0 && mine && (
        <section key="s0" className="village-step flex-1 flex flex-col gap-5">
          {/* like the "you're in" screen: the character and the greeting centred in the free space */}
          <div className="flex-1 flex flex-col justify-center items-center gap-3.5 text-center">
            <PreviewCanvas config={config} loop className="h-[300px] w-[calc(100%+2.5rem)] -mx-5" />
            <h1 className="text-2xl font-medium leading-tight tracking-tight text-balance">hi again, {mine.name}</h1>
          </div>
          <div className="flex flex-col items-center gap-4">
            <PaintButton className="w-full py-3 text-center" onClick={() => go(2)}>edit me</PaintButton>
            <Link href={`/village?me=${mine.id}`} className="hit relative text-sm underline underline-offset-2 hover:bg-highlight hover:text-highlight-text hover:no-underline active:opacity-50">
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
              autoComplete="name"
              enterKeyHint="next"
              onKeyDown={(e) => e.key === "Enter" && document.getElementById("f-email")?.focus()}
              maxLength={40}
              placeholder="name and last name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby="e-name"
              className={`${FIELD_CLASS}`}
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
              autoCorrect="off"
              enterKeyHint="next"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && nextFromYou()}
              placeholder="name@example.com"
              aria-invalid={!!errors.email}
              aria-describedby="e-email"
              className={`${FIELD_CLASS}`}
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
            <PreviewCanvas config={config} emote={emoteTick} className="h-[min(260px,36svh)]" />
            <button
              type="button"
              aria-label="shuffle"
              title="shuffle"
              onClick={() => {
                setShuffles((n) => n + 1);
                setConfig((c) => ({ ...randomConfig(), emote: c.emote }));
              }}
              className="absolute right-5 bottom-2 size-11 grid place-items-center border border-foreground/20 bg-background/80 transition-[scale,background-color,color] duration-150 ease-out active:scale-[0.95] hover:bg-highlight hover:text-highlight-text"
            >
              <span className="grid transition-[rotate] duration-300 ease-out motion-reduce:transition-none" style={{ rotate: `${shuffles * 180}deg` }}>
                <FeatherIcon icon="shuffle" size={16} />
              </span>
            </button>
          </div>
          <div ref={tabsRef} className="relative flex gap-5 overflow-x-auto overscroll-x-contain -mx-5 px-5 border-b border-foreground/10 [scrollbar-width:none]" role="tablist" aria-label="customise">
            {TABS.map((t) => (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                aria-controls="look-panel"
                onClick={() => setTab(t.id)}
                className="hit relative shrink-0 py-3 text-sm opacity-50 transition-opacity duration-150 hover:opacity-80 active:opacity-60 aria-selected:opacity-100"
              >
                {t.label}
              </button>
            ))}
            {/* one underline that slides to the picked tab (positioned in an effect) */}
            <span ref={barRef} aria-hidden className="absolute left-0 bottom-0 h-0.5 w-px bg-foreground origin-left transition-transform duration-200 ease-out motion-reduce:transition-none" />
          </div>
          <div key={tab} id="look-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex flex-col gap-1 min-h-[104px]">
            {current.rows
              .filter((r) => !r.hideWhen?.(config))
              .map((r, i) => (
                <div key={r.key} className={`look-row ${SCROLL_ROW}`} style={{ animationDelay: `${i * 40}ms` }} role="group" aria-label={r.label}>
                  {current.rows.length > 1 && <span className="shrink-0 w-14 text-xs opacity-60">{r.label}</span>}
                  {r.list.map((v) =>
                    r.type === "chips" ? (
                      <button key={v} type="button" aria-pressed={config[r.key] === v} onClick={() => set(r.key, v as never)} className={`shrink-0 ${CHIP}`}>
                        {v}
                      </button>
                    ) : (
                      <button key={v} type="button" aria-pressed={config[r.key] === v} aria-label={v} onClick={() => set(r.key, v as never)} className={SWATCH} style={{ background: v }} />
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
            <legend className="text-2xl font-medium leading-tight tracking-tight">what do you do?</legend>
            <p className="text-sm opacity-70 mt-2 mb-4 text-pretty">share your work with the other designers, so we stay connected after the event.</p>
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
                enterKeyHint="done"
                placeholder="+ write your own"
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                className={`${FIELD_CLASS} py-2`}
              />
              <button type="button" onClick={addCustomTag} disabled={!customTag.trim()} className={`${TEXT_BUTTON} disabled:opacity-40 disabled:no-underline`}>
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
              className={`${FIELD_CLASS} resize-none`}
            />
            <span id="c-intro" className="block text-right text-[11px] opacity-50 tabular-nums">
              {MAX_INTRO - intro.length}
            </span>
            <FieldError id="e-intro">{errors.intro}</FieldError>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="block text-xs tracking-wider opacity-70 mb-1.5">links · optional</legend>
            <p id="h-links" className="-mt-1 mb-0.5 text-xs opacity-60">paste your portfolio, linkedin or x. we&apos;ll sort them out.</p>
            {links.map((l, i) => {
              const kind = linkKind(l);
              const last = i === links.length - 1;
              return (
                <div key={i}>
                  <div className="relative">
                    <label htmlFor={`f-link-${i}`} className="sr-only">
                      link {i + 1}
                    </label>
                    <input
                      id={`f-link-${i}`}
                      inputMode="url"
                      autoComplete={i === 0 ? "url" : "off"}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint={last ? "go" : "next"}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !last) {
                          e.preventDefault();
                          document.getElementById(`f-link-${i + 1}`)?.focus();
                        }
                      }}
                      value={l}
                      onChange={(e) => {
                        const next = [...links];
                        next[i] = e.target.value;
                        setLinks(next);
                        if (linkErrors[i]) setLinkErrors((errs) => errs.map((x, k) => (k === i ? undefined : x)));
                      }}
                      placeholder={i === 0 ? "yourname.com" : "linkedin.com/in/yourname"}
                      aria-invalid={!!linkErrors[i]}
                      aria-describedby={`h-links k-link-${i} e-link-${i}`}
                      className={`${FIELD_CLASS} ${kind ? (links.length > 1 ? "pr-[7.75rem]" : "pr-[6.5rem]") : links.length > 1 ? "pr-10" : ""}`}
                    />
                    {/* what we think it is, live; or a way to drop an extra row */}
                    <span className="absolute right-2 inset-y-0 flex items-center gap-1.5">
                      <span id={`k-link-${i}`} className="text-[11px] opacity-60" aria-live="polite">
                        {kind ? `✓ ${LINK_LABEL[kind]}` : ""}
                      </span>
                      {links.length > 1 && (
                        <button
                          type="button"
                          aria-label={`remove link ${i + 1}`}
                          className="hit relative size-6 grid place-items-center opacity-50 hover:opacity-100"
                          onClick={() => {
                            setLinks(links.filter((_, k) => k !== i));
                            setLinkErrors(linkErrors.filter((_, k) => k !== i));
                          }}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  </div>
                  <FieldError id={`e-link-${i}`}>{linkErrors[i]}</FieldError>
                </div>
              );
            })}
            {links.length < 3 && links[links.length - 1].trim() && (
              <button
                type="button"
                className={`${TEXT_BUTTON} self-start`}
                onClick={() => {
                  setLinks([...links, ""]);
                  requestAnimationFrame(() => document.getElementById(`f-link-${links.length}`)?.focus());
                }}
              >
                + another link
              </button>
            )}
          </fieldset>

          {errors.form && (
            <p role="alert" className="text-xs text-danger">
              {errors.form}
            </p>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-5">
            <button type="button" className={TEXT_BUTTON} onClick={() => go(2)}>
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
          {/* the character and the greeting sit together in the middle of the free space */}
          <div className="flex-1 flex flex-col justify-center items-center gap-3.5 text-center">
            <PreviewCanvas config={config} emote={emoteTick} loop className="h-[300px] w-[calc(100%+2.5rem)] -mx-5" />
            <h1 className="text-2xl font-medium leading-tight tracking-tight text-balance">you&apos;re in, {mine.name}.</h1>
          </div>
          <PaintButton className="w-full py-3 text-center" onClick={() => window.location.assign(`/village?me=${mine.id}`)}>visit the village</PaintButton>
          <div className="flex justify-center flex-wrap gap-x-6 gap-y-3 text-sm">
            <button type="button" className={TEXT_BUTTON} onClick={() => go(2)}>
              edit
            </button>
            {confirmRemove ? (
              <span className="flex gap-4 items-center">
                remove you?
                <button type="button" className={`${TEXT_BUTTON} text-danger`} onClick={remove} disabled={sending}>
                  remove
                </button>
                <button type="button" className={TEXT_BUTTON} onClick={() => setConfirmRemove(false)}>
                  cancel
                </button>
              </span>
            ) : (
              <button type="button" className="hit relative underline underline-offset-2 opacity-60 transition-opacity duration-150 hover:opacity-100 active:opacity-40" onClick={() => setConfirmRemove(true)}>
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
      <button type="button" className={TEXT_BUTTON} onClick={onBack}>
        back
      </button>
      <PaintButton onClick={onNext} className="flex-1 py-3 text-center">
        next
      </PaintButton>
    </div>
  );
}
