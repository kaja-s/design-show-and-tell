"use client";

// /village/admin: the organiser's list of villagers with a remove button.
// The key (VILLAGE_ADMIN_KEY) is checked by the api on every delete; it's
// kept in sessionStorage so it's gone when the tab closes.
import { useEffect, useState } from "react";
import { FIELD_CLASS, FieldLabel } from "../../components/form-field";
import { signalWolfReady } from "../../components/shader-canvas";
import { Avatar } from "../village-app";
import type { Villager } from "../lib/villager";

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
  const [confirm, setConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    signalWolfReady();
    fetch("/api/villagers", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((d: { villagers: Villager[] }) => setVillagers(d.villagers.slice().reverse()))
      .catch(() => setMessage("couldn't load the villagers."));
  }, []);
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
    </main>
  );
}
