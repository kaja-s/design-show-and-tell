// Footer: a small mail link to the organizers, and the colophon, both set the
// same way. The colophon names are shortened to keep the line quiet; the rest
// of each name is read out to screen readers and shown on hover.

// Same inbox as the speaker proposals (src/app/api/propose/route.ts).
const CONTACT_EMAIL = "kaja.skerlj@gmail.com";

const LINK = "underline transition-colors duration-150 hover:text-foreground";

const CREDITS = [
  { href: "https://www.iniabiodun.com/", short: "ìní a", rest: "bíódún", full: "ÌníOlúwa Abíódún" },
  { href: "https://x.com/DanHollick/status/1978503090308304899", short: "dan h", rest: "ollick", full: "Dan Hollick" },
  { href: "https://github.com/mitul-s/mitul.ca", short: "mitul s", rest: "hah", full: "Mitul Shah" },
];

export function SiteFooter() {
  return (
    <footer className="px-5 pb-8">
      <div className="mx-auto flex w-full max-w-xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-[10px] text-foreground/40">
        <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
          get in touch
        </a>
        <p>
          colophon:{" "}
          {CREDITS.map((c, i) => (
            <span key={c.href}>
              {i > 0 && ", "}
              <a href={c.href} title={c.full} target="_blank" rel="noopener noreferrer" className={LINK}>
                {c.short}
                <span className="sr-only">{c.rest}</span>.
              </a>
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
