"use client";

import { useState } from "react";

export function Rsvp() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section>
        <p className="text-xs lowercase opacity-50 mb-4">rsvp</p>
        <p className="text-sm lowercase">
          you&apos;re in. see you on june 12.
        </p>
      </section>
    );
  }

  return (
    <section>
      <p className="text-xs lowercase opacity-50 mb-6">rsvp</p>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <div>
          <label htmlFor="name" className="text-xs lowercase opacity-70 block mb-1">
            name
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border-b border-foreground/20 text-sm py-2 lowercase placeholder:opacity-30"
            placeholder="your name"
          />
        </div>
        <div>
          <label htmlFor="email" className="text-xs lowercase opacity-70 block mb-1">
            email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border-b border-foreground/20 text-sm py-2 lowercase placeholder:opacity-30"
            placeholder="you@email.com"
          />
        </div>
        <button
          type="submit"
          className="text-sm lowercase font-bold px-4 py-2 border border-foreground/20 hover:bg-highlight hover:text-highlight-text transition-colors mt-4"
        >
          save my spot
        </button>
      </form>
    </section>
  );
}
