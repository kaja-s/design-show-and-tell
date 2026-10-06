"use client";

import { useState } from "react";
import { Arc } from "loading-dev";
import { PaintButton } from "./paint-button";

export function StayUpToDate() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await response.json();
      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "You're on the list.");
        setName("");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  if (!open) {
    return (
      <section className="flex justify-center">
        <PaintButton onClick={() => setOpen(true)}>stay up to date</PaintButton>
      </section>
    );
  }

  if (status === "success") {
    return (
      <section className="flex flex-col items-center gap-2 animate-fade-in">
        <p className="text-sm font-medium">{message}</p>
        <p className="text-xs opacity-50">reply back with a "Hi!" :)</p>
      </section>
    );
  }

  return (
    <section className="flex justify-center animate-fade-in">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3">
        <p className="text-sm opacity-60 text-center">
          stay up to date on the next event by entering your name and email.
        </p>
        <input
          type="text"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="name"
          required
          disabled={status === "loading"}
          className="w-full px-3 py-2 text-sm bg-transparent border border-foreground/20 placeholder:text-foreground/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        />
        <input
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={status === "loading"}
          className="w-full px-3 py-2 text-sm bg-transparent border border-foreground/20 placeholder:text-foreground/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        />
        <div className="flex justify-center">
          <PaintButton type="submit" disabled={status === "loading"}>
            {status === "loading" ? (
              <span className="inline-flex items-center gap-2">
                <Arc size={12} />
                sending
              </span>
            ) : (
              "stay up to date"
            )}
          </PaintButton>
        </div>
        {message && status === "error" && (
          <p className="text-xs text-center" style={{ color: "#ef4444" }}>
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
