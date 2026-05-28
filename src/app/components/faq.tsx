const faqs = [
  {
    q: "what is design show & tell?",
    a: "a casual gathering where designers share recent work, get feedback, and learn from each other. think of it as a crit session without the pressure.",
  },
  {
    q: "who should attend?",
    a: "anyone who works in or adjacent to design — product designers, brand designers, engineers with a design eye, design students, illustrators, or anyone curious about the craft.",
  },
  {
    q: "do i need to present?",
    a: "no. you're welcome to just listen and participate in feedback. presenting is optional and always low-stakes.",
  },
  {
    q: "what can i show?",
    a: "anything — a side project, a work-in-progress, a case study, a tool you've been exploring, or a design challenge you're stuck on.",
  },
  {
    q: "how long are presentations?",
    a: "5–10 minutes each, followed by a few minutes of group feedback. we keep it tight and informal.",
  },
];

export function Faq() {
  return (
    <section className="mb-16 sm:mb-24">
      <p className="text-xs lowercase opacity-50 mb-6">faq</p>
      <div className="space-y-6">
        {faqs.map((item) => (
          <div key={item.q}>
            <p className="text-sm font-bold lowercase mb-1">{item.q}</p>
            <p className="text-sm lowercase opacity-70 leading-relaxed">
              {item.a}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
