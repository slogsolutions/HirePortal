import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { gsap } from "gsap";

const quotes = [
  "Innovation starts here",
  "Transform your business",
  "Building the future together",
  "Excellence in every detail",
];

export const Hero = () => {
  const textRef = useRef(null); // <-- Type <HTMLHeadingElement> removed
  const cursorRef = useRef(null); // <-- Type <HTMLSpanElement> removed

  useEffect(() => {
    let currentQuoteIndex = 0;
    let currentCharIndex = 0;
    let isDeleting = false;

    const typeWriter = () => {
      const currentQuote = quotes[currentQuoteIndex];

      if (!isDeleting && currentCharIndex <= currentQuote.length) {
        if (textRef.current) {
          textRef.current.textContent = currentQuote.substring(
            0,
            currentCharIndex
          );
        }
        currentCharIndex++;
        setTimeout(typeWriter, 100);
      } else if (!isDeleting && currentCharIndex > currentQuote.length) {
        setTimeout(() => {
          isDeleting = true;
          typeWriter();
        }, 2000);
      } else if (isDeleting && currentCharIndex >= 0) {
        if (textRef.current) {
          textRef.current.textContent = currentQuote.substring(
            0,
            currentCharIndex
          );
        }
        currentCharIndex--;
        setTimeout(typeWriter, 50);
      } else {
        isDeleting = false;
        currentQuoteIndex = (currentQuoteIndex + 1) % quotes.length;
        currentCharIndex = 0;
        setTimeout(typeWriter, 500);
      }
    };

    typeWriter();

    // Cursor blink animation
    if (cursorRef.current) {
      gsap.to(cursorRef.current, {
        opacity: 0,
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
      });
    }

    // Animate buttons
    gsap.from(".hero-button", {
      y: 50,
      opacity: 0,
      duration: 1,
      stagger: 0.2,
      delay: 0.5,
      ease: "power3.out",
    });
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Image Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="/videos/office-video.png"
          alt="Office background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
        <div className="mb-8">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold mb-6 leading-tight min-h-[1.2em]">
            <span ref={textRef} className="gradient-text"></span>
            <span ref={cursorRef} className="gradient-text">
              |
            </span>
          </h1>
        </div>

        <p className="text-xl md:text-2xl text-foreground/80 mb-12 max-w-3xl mx-auto leading-relaxed">
          Empowering businesses with cutting-edge solutions and innovative
          technology that drives growth and success in the digital age.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            className="hero-button group text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
          >
            Get Started
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="hero-button text-lg px-8 py-6"
          >
            Learn More
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10">
        <div className="w-6 h-10 border-2 border-foreground/30 rounded-full flex items-start justify-center p-2">
          <div className="w-1 h-3 bg-foreground/50 rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
};