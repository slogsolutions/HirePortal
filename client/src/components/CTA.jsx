import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

// Register ScrollTrigger plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export const CTA = () => {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  const buttonsRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Animate content
    if (contentRef.current) {
      const contentElements = Array.from(contentRef.current.children);
      contentElements.forEach((el) => {
        gsap.fromTo(
          el,
          {
            scale: 0.9,
            opacity: 0,
          },
          {
            scale: 1,
            opacity: 1,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 80%",
              toggleActions: "play none none none",
            },
            immediateRender: false,
          }
        );
      });
    }

    // Animate buttons
    const buttons = buttonsRef.current?.children;
    if (buttons && buttons.length > 0) {
      Array.from(buttons).forEach((button, index) => {
        gsap.fromTo(
          button,
          {
            y: 30,
            opacity: 0,
          },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            delay: index * 0.2,
            ease: "back.out(1.4)",
            scrollTrigger: {
              trigger: section,
              start: "top 75%",
              toggleActions: "play none none none",
            },
            immediateRender: false,
          }
        );
      });
    }

    // Refresh ScrollTrigger after a short delay
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    // Cleanup
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-muted/30">
      <div className="absolute inset-0 gradient-primary opacity-10" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div ref={contentRef}>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6 text-foreground">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of companies already transforming their business with
            our platform
          </p>
        </div>

        <div ref={buttonsRef} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
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
            className="cta-button text-lg px-8 py-6 border-2"
          >
            Contact Sales
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mt-8">
          No credit card required • 14-day free trial • Cancel anytime
        </p>
      </div>
    </section>
  );
};