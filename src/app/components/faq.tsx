"use client";

import { useState, useEffect } from "react";
import FeatherIcon from "feather-icons-react";
import { KeepMeUpdated } from "./keep-me-updated";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

const linkClass = "underline hover:opacity-70 transition-opacity";

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "what is it?",
    a: (
      <>
        <strong className="font-bold">live demos. new experiments. no slides.</strong> an informal space for designers to share what they&apos;re working on, explore different approaches, and <strong className="font-bold">swap tricks</strong>.
      </>
    ),
  },
  {
    q: "who can join?",
    a: (
      <>
        <strong className="font-bold">designers making things:</strong> new products, ai experiments, anything without a playbook yet. <strong className="font-bold">students and side-projecters very welcome.</strong>
      </>
    ),
  },
  {
    q: "do i need to present?",
    a: (
      <>
        <strong className="font-bold">no.</strong> you&apos;re welcome to just listen and participate in the discussion. presenting is <strong className="font-bold">optional</strong> and always low-stakes.
      </>
    ),
  },
  {
    q: "what can i show?",
    a: (
      <>
        <strong className="font-bold">anything.</strong>{" "}
        a side project, a work-in-progress, a fully developed feature, a tool you&apos;ve been exploring, or a design challenge you&apos;re stuck on.
      </>
    ),
  },
  {
    q: "how long are the presentations?",
    a: (
      <>
        <strong className="font-bold">ten minutes, live, no slides.</strong> half-finished is perfect. then a few minutes of questions.
      </>
    ),
  },
  {
    q: "who organizes it?",
    a: (
      <>
        organized by{" "}
        <a href="https://www.kajaskerlj.com/" target="_blank" rel="noopener noreferrer" className={`${linkClass} font-bold`}>
          kaja
        </a>{" "}
        and{" "}
        <a href="https://www.linkedin.com/in/anuska-dzogic/" target="_blank" rel="noopener noreferrer" className={`${linkClass} font-bold`}>
          anuška
        </a>
        , two product designers who love bringing creative people together to share work and build community.
      </>
    ),
  },
  {
    q: "might come next time?",
    a: (
      <>
        <strong className="font-bold">we&apos;ll tell you when it&apos;s on.</strong> leave your email and you&apos;ll hear about the next one first.{" "}
        <KeepMeUpdated />
      </>
    ),
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
        <div className="flex-1 relative" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)' }}>
          <Carousel
            setApi={setApi}
            orientation="vertical"
            opts={{
              align: "center",
              loop: false,
              startIndex: 0,
            }}
            className="w-full"
          >
            <CarouselContent className="h-[150px] py-[75px]">
              {faqs.map((faq, index) => (
                <CarouselItem
                  key={index}
                  className="basis-1/3"
                  onClick={() => api?.scrollTo(index)}
                >
                  <button
                    className={`text-left text-sm block w-full transition-[opacity,filter] duration-300 ease-out cursor-pointer px-4 ${
                      current === index
                        ? "opacity-100 blur-0 font-bold"
                        : Math.abs(current - index) === 1
                        ? "opacity-60 blur-[2.5px]"
                        : "opacity-10 blur-[4px]"
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
            className="p-3 disabled:opacity-20 transition-[background-color,color,scale] duration-150 ease-out hover:bg-foreground/10 active:text-foreground/40 active:scale-[0.96] disabled:active:scale-100"
            aria-label="Previous question"
          >
            <FeatherIcon icon="chevron-up" size={16} strokeWidth={2} />
          </button>
          <button
            onClick={scrollNext}
            disabled={current === faqs.length - 1}
            className="p-3 disabled:opacity-20 transition-[background-color,color,scale] duration-150 ease-out hover:bg-foreground/10 active:text-foreground/40 active:scale-[0.96] disabled:active:scale-100"
            aria-label="Next question"
          >
            <FeatherIcon icon="chevron-down" size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Answer section */}
      <div className="border border-foreground/20 p-4 sm:p-6 min-h-[132px]">
        {/* the selected question is already bold in the list above; keep it for screen readers */}
        <p className="sr-only">{faqs[current].q}</p>
        <div className="text-[14px] leading-relaxed">{faqs[current].a}</div>
      </div>
    </section>
  );
}
