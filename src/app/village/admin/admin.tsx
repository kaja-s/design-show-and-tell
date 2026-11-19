"use client";

// /village/admin: the organiser's list of villagers with a remove button.
// The key (VILLAGE_ADMIN_KEY) is checked by the api on every delete; it's
// kept in sessionStorage so it's gone when the tab closes.
import { useEffect, useState } from "react";
import { FIELD_CLASS, FieldLabel } from "../../components/form-field";
import { signalWolfReady } from "../../components/shader-canvas";
import { Avatar } from "../village-app";
import type { Villager } from "../lib/villager";
import type { Letter } from "../lib/store";

const KEY = "village:admin-key";

export function Admin() {
  const [key, setKey] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) ?? "";
    } catch {
      return "";
    }
  });
  const [villagers, setVillagers] = useState<Villager[] | null>(null);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [letters, setLetters] = useState<Letter[] | null>(null);

  useEffect(() => signalWolfReady(), []);
  // reload when the key changes: a matching key also returns everyone's email
  useEffect(() => {
    const t = window.setTimeout(() => {
      fetch("/api/villagers", { cache: "no-store", headers: key ? { "x-admin-key": key } : {} })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((d: { villagers: Villager[]; emails?: Record<string, string> }) => {
          setVillagers(d.villagers.slice().reverse());
          setEmails(d.emails ?? {});
        })
        .catch(() => setMessage("couldn't load the villagers."));
    }, key ? 400 : 0);
    // letters from the village mailbox: only with the right key
    const tl = window.setTimeout(() => {
      if (!key) return setLetters(null);
      fetch("/api/letters", { cache: "no-store", headers: { "x-admin-key": key } })
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((d: { letters: Letter[] }) => setLetters(d.letters))
        .catch(() => setLetters(null));
    }, 400);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(tl);
    };
  }, [key]);
  const remove = async (v: Villager) => {
    const res = await fetch(`/api/villagers/${v.id}`, { method: "DELETE", headers: { "x-admin-key": key } });
    setConfirm(null);
    if (res.ok) {
      setMessage(`removed ${v.name}.`);
      setVillagers((list) => list?.filter((x) => x.id !== v.id) ?? null);
    } else setMessage(res.status === 403 ? "that key doesn't match VILLAGE_ADMIN_KEY." : "couldn't remove them. try again.");
  };

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8 flex flex-col gap-5">
      <h1 className="text-xl font-medium">village admin</h1>
      <div>
        <FieldLabel htmlFor="admin-key">admin key</FieldLabel>
        <input
          id="admin-key"
          type="password"
          autoComplete="off"
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            try {
              sessionStorage.setItem(KEY, e.target.value);
            } catch {}
          }}
          className={FIELD_CLASS}
        />
      </div>
      <p className="text-xs opacity-70 min-h-4" role="status">
        {message}
      </p>
      <ul className="flex flex-col divide-y divide-foreground/10">
        {villagers?.map((v) => (
          <li key={v.id} className="flex items-center gap-3 py-2.5">
            <Avatar v={v} size={40} />
            <div className="flex-1 min-w-0">
              <div className="truncate">{v.name}</div>
              {emails[v.id] !== undefined && <div className="text-xs truncate">{emails[v.id] || "no email"}</div>}
              <div className="text-xs opacity-60 truncate">
                {v.tags.join(" · ")} · {new Date(v.createdAt).toLocaleString("sl-SI")}
              </div>
              <div className="text-xs opacity-60 truncate">{v.intro}</div>
            </div>
            {confirm === v.id ? (
              <span className="flex gap-3 text-xs">
                <button type="button" className="underline text-danger" onClick={() => remove(v)} disabled={!key}>
                  remove
                </button>
                <button type="button" className="underline" onClick={() => setConfirm(null)}>
                  keep
                </button>
              </span>
            ) : (
              <button type="button" className="text-xs underline hover:opacity-70" onClick={() => setConfirm(v.id)}>
                remove…
              </button>
            )}
          </li>
        ))}
        {villagers?.length === 0 && <li className="py-2.5 text-sm opacity-60">nobody lives in the village yet.</li>}
      </ul>
      {letters && (
        <section aria-labelledby="letters-title" className="flex flex-col gap-3 pt-4 border-t border-foreground/10">
          <h2 id="letters-title" className="text-lg font-medium">
            letters <span className="opacity-50 tabular-nums">{letters.length}</span>
          </h2>
          {letters.length === 0 && <p className="text-sm opacity-60">the mailbox is empty.</p>}
          <ul className="flex flex-col gap-3">
            {letters.map((l) => (
              <li key={l.id} className="border border-foreground/15 p-3.5 flex flex-col gap-2 select-text">
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{l.text}</p>
                <div className="text-xs opacity-60 flex flex-wrap gap-x-2">
                  <span>{l.name || "anonymous"}</span>
                  {l.email && (
                    <a className="underline" href={`mailto:${l.email}`}>
                      {l.email}
                    </a>
                  )}
                  <span>{new Date(l.at).toLocaleString("sl-SI")}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
