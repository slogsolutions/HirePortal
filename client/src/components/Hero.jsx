import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { gsap } from "gsap";
import { useNavigate } from "react-router-dom";

const quotes = [
  "Innovation starts here with Slog Solutions.",
  "Transform your business with Slog Solutions.",
  "Building the future together with Slog Solutions.",
  "Achieve Excellence with with Slog Solutions.",
];

export const Hero = () => {
  const textRef = useRef(null);
  const cursorRef = useRef(null);
  const sectionRef = useRef(null);

   const navigate = useNavigate();

  useEffect(() => {
    let currentQuoteIndex = 0;
    let currentCharIndex = 0;
    let isDeleting = false;
    let timeoutId = null;

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
        timeoutId = setTimeout(typeWriter, 100);
      } else if (!isDeleting && currentCharIndex > currentQuote.length) {
        timeoutId = setTimeout(() => {
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
        timeoutId = setTimeout(typeWriter, 50);
      } else {
        isDeleting = false;
        currentQuoteIndex = (currentQuoteIndex + 1) % quotes.length;
        currentCharIndex = 0;
        timeoutId = setTimeout(typeWriter, 500);
      }
    };

    // Start typewriter
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
    const buttons = document.querySelectorAll(".hero-button");
    if (buttons.length > 0) {
      Array.from(buttons).forEach((button, index) => {
        gsap.fromTo(
          button,
          {
            y: 50,
            opacity: 0,
          },
          {
            y: 0,
            opacity: 1,
            duration: 1,
            delay: 0.5 + index * 0.2,
            ease: "power3.out",
            immediateRender: false,
          }
        );
      });
    }

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background "
    >
      {/* Video/Image Background  Laksh*/} 
      <div className="absolute inset-0 z-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/backgroundVideo.mp4" type="video/mp4" />
        </video>
        {/* Fallback image if video doesn't load */}
        <img
          src="/videos/office-video.png"
          alt="Office background"
          className="w-full h-full object-cover hidden"
        />
       <div className="absolute inset-0 video-overlay" />
       
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-emerald-100">
        <div className="mb-8 text-emerald-100">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold mb-6 leading-tight min-h-[1.2em] dark:text-emerald-300">
            <span ref={textRef} className="gradient-text inline-block text-emerald-800"></span>
            <span ref={cursorRef} className="gradient-text inline-block ml-1 text-emerald-800">
              |
            </span>
          </h1>
        </div>

        <p className="text-xl md:text-2xl  mb-12 max-w-3xl mx-auto leading-relaxed text-emerald-200">
          Empowering businesses with cutting-edge solutions and innovative
          technology that drives growth and success in the digital age.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            className="hero-button group text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-emerald-900 shadow-lg"
           onClick={() => navigate("/login")}
          >
            Get Started
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="hero-button text-lg px-8 py-6 border-2 text-emerald-900 bg-indigo-100"
            onClick={() => navigate("/attendance")}
          >
            Daily Logs
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