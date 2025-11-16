import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export const CTA = () => {
  const sectionRef = useRef(null); // <-- Type <HTMLElement> removed here

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    gsap.from(".cta-content", {
      scrollTrigger: {
        trigger: section,
        start: "top 80%",
      },
      scale: 0.9,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
    });

    gsap.from(".cta-button", {
      scrollTrigger: {
        trigger: section,
        start: "top 75%",
      },
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: "back.out(1.4)",
    });
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 gradient-primary opacity-10" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="cta-content text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
          Ready to Get Started?
        </h2>
        <p className="cta-content text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
          Join thousands of companies already transforming their business with
          our platform
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            className="cta-button group text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
          >
            Start Free Trial
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="cta-button text-lg px-8 py-6"
          >
            Contact Sales
          </Button>
        </div>

        <p className="cta-content text-sm text-muted-foreground mt-8">
          No credit card required • 14-day free trial • Cancel anytime
        </p>
      </div>
    </section>
  );
};