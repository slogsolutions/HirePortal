import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Building2, Users, Target, Award } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { icon: Building2, value: "15+", label: "Years Experience" },
  { icon: Users, value: "500+", label: "Team Members" },
  { icon: Target, value: "1000+", label: "Projects Delivered" },
  { icon: Award, value: "50+", label: "Awards Won" },
];

export const About = () => {
  const sectionRef = useRef(null); // <-- Type <HTMLElement> removed here

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    // Animate heading
    gsap.from(".about-heading", {
      scrollTrigger: {
        trigger: section,
        start: "top 80%",
      },
      y: 50,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
    });

    // Animate stats
    gsap.from(".stat-card", {
      scrollTrigger: {
        trigger: section,
        start: "top 70%",
      },
      y: 80,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power3.out",
    });
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-4 relative bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="about-heading text-4xl md:text-5xl font-display font-bold mb-4">
            About Our Company
          </h2>
          <p className="about-heading text-xl text-muted-foreground max-w-3xl mx-auto">
            We are a team of passionate professionals dedicated to delivering
            excellence in everything we do. Our mission is to transform
            businesses through innovative solutions and exceptional service.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="stat-card text-center p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <stat.icon className="w-8 h-8 text-primary" />
              </div>
              <div className="text-4xl font-display font-bold gradient-text mb-2">
                {stat.value}
              </div>
              <div className="text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};