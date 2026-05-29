"use client";

import { useState, useEffect } from "react";
import FeatherIcon from "feather-icons-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

const faqs = [
  {
    q: "what is it?",
    a: "live demos. new experiments. no slides. an informal space for designers to share what they're working on, explore different approaches, and steal ideas from each other.",
  },
  {
    q: "when + where?",
    a: "june 11th, 2026 at 6:00 at Impact Hub Ljubljana (Bavarski dvor).",
  },
  {
    q: "who can join?",
    a: "designers who are creating new products and features, experimenting with AI tools or crafting experiences that don't quite have a playbook yet",
  },
  {
    q: "do i need to present?",
    a: "no. you're welcome to just listen and participate in the discussion. presenting is optional and always low-stakes.",
  },
  {
    q: "what can i show?",
    a: "anything. a side project, a work-in-progress, a fully developed feature, a tool you've been exploring, or a design challenge you're stuck on.",
  },
  {
    q: "how long are the presentations?",
    a: "5–10 minutes each, followed by a few minutes of group q&a. we keep it tight and informal.",
  },
  {
    q: "what is the vibe?",
    a: "friendly, collaborative, and low-pressure. it's about learning and connecting, not showing off or competing.",
  },
  {
    q: "who is the organizer?",
    a: "organized by kaja, a designer who loves bringing creative people together.",
  },
];

export function Faq() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const scrollPrev = () => api?.scrollPrev();
  const scrollNext = () => api?.scrollNext();

  return (
    <section className="mb-8 sm:mb-12">
      {/* Questions section with arrows */}
      <div className="flex items-end gap-4 mb-6">
        <div className="flex-1">
          <Carousel
            setApi={setApi}
            orientation="vertical"
            opts={{
              align: "center",
              loop: false,
              startIndex: 0,
            }}
            className="w-full carousel-anim-1"
          >
            <CarouselContent className="h-[150px] py-[75px]">
              {faqs.map((faq, index) => (
                <CarouselItem
                  key={index}
                  className="basis-1/3"
                  onClick={() => api?.scrollTo(index)}
                >
                  <button
                    className={`text-left text-sm block w-full transition-all duration-700 cursor-pointer px-4 ${
                      current === index
                        ? "opacity-100 blur-0 font-bold"
                        : "opacity-40 blur-[2px]"
                    } hover:opacity-70`}
                  >
                    {faq.q}
                  </button>
                </CarouselItem>
              ))}
              {/* Empty spacer items to allow last question to center */}
              <CarouselItem key="spacer-1" className="basis-1/3 pointer-events-none" />
              <CarouselItem key="spacer-2" className="basis-1/3 pointer-events-none" />
            </CarouselContent>
          </Carousel>
        </div>

        {/* Navigation arrows */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={scrollPrev}
            disabled={current === 0}
            className="p-1 transition-opacity hover:opacity-60 disabled:opacity-20"
            aria-label="Previous question"
          >
            <FeatherIcon icon="chevron-up" size={16} strokeWidth={2} />
          </button>
          <button
            onClick={scrollNext}
            disabled={current === faqs.length - 1}
            className="p-1 transition-opacity hover:opacity-60 disabled:opacity-20"
            aria-label="Next question"
          >
            <FeatherIcon icon="chevron-down" size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Answer section */}
      <div className="border border-foreground/20 p-6 min-h-[180px]">
        <div className="flex gap-3 mb-4 pb-3 border-b border-foreground/20 items-center">
          <span className="text-[10px] tracking-wider opacity-50">Q:</span>
          <p className="text-[14px] tracking-wide flex-1 opacity-60">{faqs[current].q}</p>
        </div>
        <div className="flex gap-3 items-start">
          <span className="text-[10px] tracking-wider opacity-50 mt-[3px]">A:</span>
          <p className="text-[14px] leading-relaxed flex-1">
            {current === 1 ? (
              <>
                June 11th, 2026 at 6:00 at{" "}
                <a
                  href="https://www.google.com/maps/place//data=!4m2!3m1!1s0x476533d1a3dfa6eb:0x27ae9f8c81542ca2?sa=X&ved=1t:8290&ictx=111"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-70 transition-opacity"
                >
                  Impact Hub Ljubljana
                </a>
                {" "}(Bavarski dvor).
              </>
            ) : current === faqs.length - 1 ? (
              <>
                organized by{" "}
                <a
                  href="https://www.linkedin.com/in/kajaskerlj/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:opacity-70 transition-opacity"
                >
                  kaja
                </a>
                , a designer who loves bringing creative people together to share work and build community.
              </>
            ) : (
              faqs[current].a
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
