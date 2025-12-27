import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Building2, Users, Target, Award } from "lucide-react";

// Register ScrollTrigger plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const stats = [
  { icon: Building2, value: "10+", label: "Years Experience" },
  { icon: Users, value: "100+", label: "Team Members" },
  { icon: Target, value: "50+", label: "Projects Delivered" },
  { icon: Award, value: "5000+", label: "Students Mentored" },
];

export const About = () => {
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const statsRef = useRef(null);

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

    // Animate stats
    const statCards = statsRef.current?.children;
    if (statCards && statCards.length > 0) {
      Array.from(statCards).forEach((card, index) => {
        gsap.fromTo(
          card,
          {
            y: 80,
            opacity: 0,
          },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            delay: index * 0.15,
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

    // Refresh ScrollTrigger after a short delay to check initial positions
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 100);

    // Cleanup
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-4 sm:px-6 lg:px-8 relative bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div ref={headingRef} className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-foreground">
            About Our Company
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We are a team of passionate professionals dedicated to delivering
            excellence in everything we do. Our mission is to transform
            businesses through innovative solutions and exceptional service.
          </p>
        </div>

        <div ref={statsRef} className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={index}
                className="stat-card text-center p-6 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <IconComponent className="w-8 h-8 text-primary" />
                </div>
                <div className="text-4xl font-display font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};