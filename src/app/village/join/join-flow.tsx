"use client";

// ---------------------------------------------------------------------------
// /village/join: the qr code on the slide lands here. Phone-first, three
// steps (name, look, card), then the character walks into the village.
// The phone keeps an edit token (lib/me.ts), so coming back later offers
// "edit my character".
// ---------------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import FeatherIcon from "feather-icons-react";
import { Arc } from "loading-dev";
import { PaintButton } from "../../components/paint-button";
import { FIELD_CLASS, FieldError, FieldLabel } from "../../components/form-field";
import { signalWolfReady } from "../../components/shader-canvas";
import { Preview } from "../lib/preview";
import { portrait } from "../lib/characters";
import { clearMe, readMe, writeMe } from "../lib/me";
import {
  CLOTH, HAIR_COLORS, MAX_INTRO, MAX_TAGS, OPTIONS, SKIN, TAGS, VISITOR, looksLikeUrl, photoUrl, randomConfig,
  type Config, type FieldErrors, type Villager,
} from "../lib/villager";

type Step = 0 | 1 | 2 | 3 | 4;
type Photo = { kind: "keep"; url: string } | { kind: "new"; dataUrl: string } | { kind: "none" };
// Ordered by how much each choice makes the character look like you. Each
// category has at most two rows: a style, then its colour (hidden when the
// style is "none").
type Row = { type: "chips" | "swatches"; key: keyof Config; list: readonly (string | null)[]; label?: string; hideWhen?: (c: Config) => boolean };
const CATEGORIES: { id: string; label: string; rows: Row[] }[] = [
  { id: "hair", label: "hair", rows: [{ type: "chips", key: "hair", list: OPTIONS.hair }, { type: "swatches", key: "hairColor", list: HAIR_COLORS, hideWhen: (c) => c.hair === "none" }] },
  { id: "skin", label: "skin", rows: [{ type: "swatches", key: "skin", list: SKIN }] },
  { id: "hat", label: "hat", rows: [{ type: "chips", key: "hat", list: OPTIONS.hat }, { type: "swatches", key: "hatColor", list: CLOTH, hideWhen: (c) => c.hat === "none" }] },
  { id: "coat", label: "coat", rows: [{ type: "chips", key: "coat", list: OPTIONS.coat }, { type: "swatches", key: "coatColor", list: CLOTH }] },
  { id: "extras", label: "extras", rows: [{ type: "chips", key: "extra", list: OPTIONS.extra }, { type: "swatches", key: "scarf", list: [null, ...CLOTH], label: "scarf" }] },
  { id: "costume", label: "costume", rows: [{ type: "chips", key: "costume", list: OPTIONS.costume }] },
  { id: "emote", label: "hello", rows: [{ type: "chips", key: "emote", list: OPTIONS.emote }] },
];
const CHIP =
  "border border-foreground/20 px-2.5 py-1.5 text-xs transition-[scale,background-color,color,border-color] duration-150 ease-out active:scale-[0.97] aria-pressed:bg-highlight aria-pressed:text-highlight-text aria-pressed:border-highlight";
const STEPS = ["name", "look", "card"];

function PreviewCanvas({ config, emote, loop, className }: { config: Config; emote?: number; loop?: boolean; className: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const preview = useRef<Preview | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const p = new Preview(ref.current);
    preview.current = p;
    signalWolfReady();
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
  return <canvas ref={ref} className={`block w-full touch-pan-y cursor-grab ${className}`} aria-label="your character. drag to spin." />;
}

// Square-crop an uploaded photo to 256px so it stays small.
function cropPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const s = Math.min(img.width, img.height);
      c.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    img.src = url;
  });
}

export function JoinFlow() {
  const [step, setStep] = useState<Step>(0);
  // start without a costume: it would override the hat and coat people try first
  const [config, setConfig] = useState<Config>(() => ({ ...randomConfig(), costume: "none" }));
  const [cat, setCat] = useState("hair");
  const [emoteTick, setEmoteTick] = useState(0);
  const [name, setName] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [intro, setIntro] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [twitter, setTwitter] = useState("");
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<Photo>({ kind: "none" });
  const [photoHint, setPhotoHint] = useState("");
  const [errors, setErrors] = useState<FieldErrors & { consent?: string; form?: string }>({});
  const [sending, setSending] = useState(false);
  const [mine, setMine] = useState<Villager | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // If this phone already moved in, start from that character.
  useEffect(() => {
    const me = readMe();
    if (!me) return;
    fetch(`/api/villagers/${me.id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(({ villager: v }: { villager: Villager }) => {
        setMine(v);
        setConfig(v.config);
        setName(v.name);
        setTags(v.tags);
        setIntro(v.intro);
        setPortfolio(v.portfolio);
        setLinkedin(v.linkedin);
        setTwitter(v.twitter);
        setConsent(true);
        setPhoto(v.hasPhoto ? { kind: "keep", url: photoUrl(v) } : { kind: "none" });
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
  const nextFromName = () => {
    if (!name.trim()) return setErrors({ name: "add your name." });
    setErrors({});
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
    if (!tags.includes(t)) {
      if (tags.length >= MAX_TAGS) return setErrors((e) => ({ ...e, tags: `${MAX_TAGS} at most.` }));
      setTags([...tags, t]);
    }
    setCustomTag("");
    setErrors((e) => ({ ...e, tags: undefined }));
  };
  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPhotoHint("that file isn't an image. try a jpg or png.");
    try {
      setPhoto({ kind: "new", dataUrl: await cropPhoto(file) });
      setPhotoHint("");
    } catch {
      setPhotoHint("couldn't read that image. try another one.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!tags.length) errs.tags = "pick a role.";
    if (!intro.trim()) errs.intro = "add a line about you.";
    if (!portfolio.trim()) errs.portfolio = "add a link to your work.";
    else if (!looksLikeUrl(portfolio)) errs.portfolio = "that doesn't look like a link.";
    if (!consent) errs.consent = "tick this to move in.";
    setErrors(errs);
    if (Object.keys(errs).length) return focusFirst(errs);

    setSending(true);
    const body = {
      name, tags, intro, portfolio, linkedin, twitter, config,
      ...(photo.kind === "new" ? { photo: photo.dataUrl } : photo.kind === "none" && mine?.hasPhoto ? { photo: null } : {}),
    };
    try {
      const me = readMe();
      let res = me && mine
        ? await fetch(`/api/villagers/${me.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-edit-token": me.token }, body: JSON.stringify(body) })
        : null;
      if (!res || res.status === 404 || res.status === 403) {
        // never moved in, or the character was removed: move in fresh
        res = await fetch("/api/villagers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors({ ...(data.errors ?? {}), form: data.error ?? "something went wrong. try again." });
        if (data.errors) focusFirst(data.errors);
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
  const focusFirst = (errs: Record<string, string | undefined>) => {
    const order: [string, string][] = [["tags", "tag-0"], ["intro", "f-intro"], ["portfolio", "f-portfolio"], ["linkedin", "f-linkedin"], ["twitter", "f-twitter"], ["consent", "f-consent"]];
    const hit = order.find(([k]) => errs[k]);
    if (hit) document.getElementById(hit[1])?.focus();
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
      go(0);
    } catch {
      setErrors({ form: "couldn't remove you right now. try again in a moment." });
    } finally {
      setSending(false);
    }
  };

  const photoSrc = photo.kind === "keep" ? photo.url : photo.kind === "new" ? photo.dataUrl : null;
  const category = CATEGORIES.find((c) => c.id === cat)!;

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

      {step === 0 && (
        <section key="s0" className="village-step flex-1 flex flex-col gap-5">
          <PreviewCanvas config={mine ? config : VISITOR} loop className="h-[320px] -mx-5" />
          <h1 className="text-2xl font-medium leading-tight tracking-tight">{mine ? `hi again, ${mine.name}` : "move into the village"}</h1>
          {!mine && (
            <ol className="grid grid-cols-3 gap-1.5 text-xs">
              {STEPS.map((label, i) => (
                <li key={label} className="village-stagger flex flex-col gap-0.5 border-t-2 border-foreground/15 pt-1.5" style={{ animationDelay: `${120 + i * 50}ms` }}>
                  <span className="tabular-nums opacity-50">{i + 1}</span>
                  {label}
                </li>
              ))}
            </ol>
          )}
          <div className="flex-1" />
          <div className="flex flex-col items-center gap-4">
            <PaintButton className="w-full py-3 text-center" onClick={() => go(mine ? 2 : 1)}>{mine ? "edit me" : "start"}</PaintButton>
            {mine && (
              <Link href={`/village?me=${mine.id}`} className="text-sm underline underline-offset-2 hover:bg-highlight hover:text-highlight-text hover:no-underline">
                visit the village
              </Link>
            )}
          </div>
        </section>
      )}

      {step === 1 && (
        <section key="s1" className="village-step flex-1 flex flex-col gap-4">
          <h1 className="text-2xl font-medium leading-tight tracking-tight">
            <label htmlFor="f-name">your name</label>
          </h1>
          <div>
            <input
              id="f-name"
              autoFocus
              autoComplete="given-name"
              maxLength={40}
              placeholder="kaja"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && nextFromName()}
              aria-invalid={!!errors.name}
              aria-describedby="e-name"
              className={`${FIELD_CLASS} text-base`}
            />
            <FieldError id="e-name">{errors.name}</FieldError>
          </div>
          <div className="flex-1" />
          <Nav onBack={() => go(0)} onNext={nextFromName} />
        </section>
      )}

      {step === 2 && (
        <section key="s2" className="village-step flex-1 flex flex-col gap-4">
          <div className="relative -mx-5">
            <PreviewCanvas config={config} emote={emoteTick} className="h-[300px]" />
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
          {/* quiet text tabs: the options below are the only things that look like buttons */}
          <div className="flex gap-5 overflow-x-auto -mx-5 px-5 border-b border-foreground/10 [scrollbar-width:none]" role="tablist" aria-label="customise">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                id={`tab-${c.id}`}
                type="button"
                role="tab"
                aria-selected={cat === c.id}
                aria-controls="look-panel"
                onClick={() => setCat(c.id)}
                className="shrink-0 -mb-px py-2 text-sm border-b-2 border-transparent opacity-50 transition-[opacity,border-color] duration-150 hover:opacity-80 aria-selected:opacity-100 aria-selected:border-foreground"
              >
                {c.label}
              </button>
            ))}
          </div>
          <div id="look-panel" role="tabpanel" aria-labelledby={`tab-${cat}`} className="flex flex-col gap-4 min-h-[96px]">
            {category.rows
              .filter((r) => !r.hideWhen?.(config))
              .map((r) => (
                <div key={r.key} className="flex items-center gap-3 overflow-x-auto -mx-5 px-5 py-1 [scrollbar-width:none]" role="group" aria-label={r.label ?? `${category.label} ${r.type === "swatches" ? "colour" : "style"}`}>
                  {r.label && <span className="shrink-0 text-xs opacity-60">{r.label}</span>}
                  {r.list.map((v) =>
                    r.type === "chips" ? (
                      <button key={String(v)} type="button" aria-pressed={config[r.key] === v} onClick={() => set(r.key, v as never)} className={`shrink-0 ${CHIP}`}>
                        {v}
                      </button>
                    ) : (
                      <button
                        key={String(v)}
                        type="button"
                        aria-pressed={config[r.key] === v}
                        aria-label={v ?? "none"}
                        onClick={() => set(r.key, v as never)}
                        className="relative shrink-0 size-8 rounded-full border border-foreground/20 transition-[scale] duration-150 ease-out active:scale-[0.92] aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-foreground aria-pressed:outline"
                        style={v ? { background: v } : undefined}
                      >
                        {v === null && <span className="absolute inset-x-[4px] top-[14px] h-[2px] bg-foreground/50 -rotate-45 rounded-sm" />}
                      </button>
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
        <form key="s3" ref={formRef} noValidate onSubmit={submit} className="village-step flex flex-col gap-5">
          <h1 className="text-2xl font-medium leading-tight tracking-tight">your card</h1>

          <div className="flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoSrc ?? portrait(config)} alt="your profile picture" className="size-16 rounded-full object-cover border border-foreground/15 bg-[#dbe8ff]" />
            <div className="flex flex-col gap-0.5 text-xs">
              <div className="flex gap-3">
                <input type="file" id="f-photo" accept="image/*" className="peer sr-only" onChange={(e) => onPhoto(e.target.files?.[0])} />
                <label htmlFor="f-photo" className="underline underline-offset-2 cursor-pointer hover:bg-highlight hover:text-highlight-text hover:no-underline peer-focus-visible:outline-2 peer-focus-visible:outline-foreground peer-focus-visible:outline">
                  {photoSrc ? "change photo" : "add a photo"}
                </label>
                {photoSrc && (
                  <button type="button" className="underline underline-offset-2 opacity-60 hover:opacity-100" onClick={() => setPhoto({ kind: "none" })}>
                    remove
                  </button>
                )}
              </div>
              {photoHint && <span className="text-danger">{photoHint}</span>}
            </div>
          </div>

          <fieldset aria-describedby="e-tags">
            <legend className="text-xs tracking-wider opacity-70 mb-1.5">role</legend>
            <div className="flex flex-wrap gap-1.5">
              {[...TAGS, ...tags.filter((t) => !TAGS.includes(t))].map((t, i) => (
                <button key={t} id={`tag-${i}`} type="button" aria-pressed={tags.includes(t)} onClick={() => toggleTag(t)} className={CHIP}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <label htmlFor="f-tag" className="sr-only">
                add your own role
              </label>
              <input
                id="f-tag"
                value={customTag}
                maxLength={24}
                placeholder="+ your own"
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                className={`${FIELD_CLASS} text-base py-2`}
              />
              <button type="button" onClick={addCustomTag} className="text-sm underline underline-offset-2 hover:opacity-70">
                add
              </button>
            </div>
            <FieldError id="e-tags">{errors.tags}</FieldError>
          </fieldset>

          <div>
            <FieldLabel htmlFor="f-intro">about you</FieldLabel>
            <textarea
              id="f-intro"
              rows={2}
              maxLength={MAX_INTRO}
              value={intro}
              onChange={(e) => setIntro(e.target.value)}
              placeholder="what you do, in a line"
              aria-invalid={!!errors.intro}
              aria-describedby="c-intro e-intro"
              className={`${FIELD_CLASS} text-base resize-none`}
            />
            {intro.length > MAX_INTRO - 40 && (
              <span id="c-intro" className="block text-right text-[11px] opacity-60 tabular-nums">
                {MAX_INTRO - intro.length} left
              </span>
            )}
            <FieldError id="e-intro">{errors.intro}</FieldError>
          </div>

          <div>
            <FieldLabel htmlFor="f-portfolio">portfolio</FieldLabel>
            <input id="f-portfolio" inputMode="url" autoComplete="url" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="yourname.com" aria-invalid={!!errors.portfolio} aria-describedby="e-portfolio" className={`${FIELD_CLASS} text-base`} />
            <FieldError id="e-portfolio">{errors.portfolio}</FieldError>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="min-w-0">
              <FieldLabel htmlFor="f-linkedin">linkedin</FieldLabel>
              <input id="f-linkedin" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="optional" aria-invalid={!!errors.linkedin} aria-describedby="e-linkedin" className={`${FIELD_CLASS} text-base`} />
              <FieldError id="e-linkedin">{errors.linkedin}</FieldError>
            </div>
            <div className="min-w-0">
              <FieldLabel htmlFor="f-twitter">twitter / x</FieldLabel>
              <input id="f-twitter" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="optional" aria-invalid={!!errors.twitter} aria-describedby="e-twitter" className={`${FIELD_CLASS} text-base`} />
              <FieldError id="e-twitter">{errors.twitter}</FieldError>
            </div>
          </div>

          <div>
            <label className="flex gap-2.5 items-start text-xs">
              <input id="f-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={!!errors.consent} aria-describedby="e-consent" className="size-[18px] mt-px accent-[var(--foreground)] shrink-0" />
              <span>show my card in the village</span>
            </label>
            <FieldError id="e-consent">{errors.consent}</FieldError>
          </div>

          {errors.form && (
            <p role="alert" className="text-xs text-danger">
              {errors.form}
            </p>
          )}
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
                "save changes"
              ) : (
                "walk into the village"
              )}
            </PaintButton>
          </div>
        </form>
      )}

      {step === 4 && mine && (
        <section key="s4" className="village-step flex-1 flex flex-col gap-3.5">
          <PreviewCanvas config={config} emote={emoteTick} loop className="h-[340px] -mx-5" />
          <h1 className="text-2xl font-medium leading-tight tracking-tight">you&apos;re in, {mine.name}.</h1>
          <p className="text-sm opacity-70">look up at the big screen.</p>
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
