import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

gsap.registerPlugin(ScrollTrigger);

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
  const sectionRef = useRef(null); // <-- Type <HTMLElement> removed here

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    gsap.from(".testimonials-heading", {
      scrollTrigger: {
        trigger: section,
        start: "top 80%",
      },
      y: 50,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
    });

    gsap.from(".testimonial-card", {
      scrollTrigger: {
        trigger: section,
        start: "top 70%",
      },
      x: (index) => (index % 2 === 0 ? -100 : 100),
      opacity: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: "power3.out",
    });
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="testimonials-heading text-4xl md:text-5xl font-display font-bold mb-4">
            What Our Clients Say
          </h2>
          <p className="testimonials-heading text-xl text-muted-foreground max-w-2xl mx-auto">
            Don't just take our word for it - hear from our satisfied clients
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card
              key={index}
              className="testimonial-card bg-card/50 backdrop-blur-sm border-border/50"
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
                    <p className="font-semibold">{testimonial.author}</p>
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