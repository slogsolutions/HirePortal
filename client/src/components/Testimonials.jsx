import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Register ScrollTrigger plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}


const testimonials = [
  {
    quote: "Working with this team has been an absolute game-changer for our business. Their expertise and dedication are unmatched.",
    author: "Sarah Johnson",
    role: "CEO, TechCorp",
    initials: "SJ",
  },
  {
    quote: "The quality of work and attention to detail exceeded our expectations. Highly recommend for any serious project.",
    author: "Michael Chen",
    role: "CTO, Innovation Labs",
    initials: "MC",
  },
  {
    quote: "Professional, responsive, and results-driven. They delivered exactly what we needed, on time and within budget.",
    author: "Emily Rodriguez",
    role: "Director, Global Solutions",
    initials: "ER",
  },
];

export const Testimonials = () => {
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const cardsRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Animate heading
    if (headingRef.current) {
      const headingElements = Array.from(headingRef.current.children);
      headingElements.forEach((el) => {
        gsap.fromTo(
          el,
          {
            y: 50,
            opacity: 0,
          },
          {
            y: 0,
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

    // Animate testimonial cards
    const testimonialCards = cardsRef.current?.children;
    if (testimonialCards && testimonialCards.length > 0) {
      Array.from(testimonialCards).forEach((card, index) => {
        gsap.fromTo(
          card,
          {
            x: index % 2 === 0 ? -100 : 100,
            opacity: 0,
          },
          {
            x: 0,
            opacity: 1,
            duration: 0.8,
            delay: index * 0.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: section,
              start: "top 70%",
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
    <section ref={sectionRef} className="py-24 px-4 sm:px-6 lg:px-8 relative bg-background">
      <div className="max-w-6xl mx-auto">
        <div ref={headingRef} className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-foreground">
            What Our Clients Say
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Don't just take our word for it - hear from our satisfied clients
          </p>
        </div>

        <div ref={cardsRef} className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="testimonial-card bg-card/50 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <Quote className="w-10 h-10 text-primary/30 mb-4" />
                <p className="text-foreground/80 mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {testimonial.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};