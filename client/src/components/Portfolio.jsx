import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ExternalLink } from "lucide-react";

// Register ScrollTrigger plugin
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const projects = [
  {
    title: "E-Commerce Platform",
    category: "Web Development",
    color: "from-blue-500/20 to-cyan-500/20",
  },
  {
    title: "Mobile Banking App",
    category: "Mobile Development",
    color: "from-purple-500/20 to-pink-500/20",
  },
  {
    title: "Healthcare Portal",
    category: "Healthcare Tech",
    color: "from-green-500/20 to-emerald-500/20",
  },
  {
    title: "Real Estate Platform",
    category: "PropTech",
    color: "from-orange-500/20 to-red-500/20",
  },
  {
    title: "Learning Management",
    category: "EdTech",
    color: "from-indigo-500/20 to-blue-500/20",
  },
  {
    title: "Analytics Dashboard",
    category: "Data Visualization",
    color: "from-yellow-500/20 to-orange-500/20",
  },
];

export const Portfolio = () => {
  const sectionRef = useRef(null);
  const headingRef = useRef(null);
  const itemsRef = useRef(null);

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

    // Animate portfolio items
    const portfolioItems = itemsRef.current?.children;
    if (portfolioItems && portfolioItems.length > 0) {
      Array.from(portfolioItems).forEach((item, index) => {
        gsap.fromTo(
          item,
          {
            scale: 0.8,
            opacity: 0,
          },
          {
            scale: 1,
            opacity: 1,
            duration: 0.6,
            delay: index * 0.1,
            ease: "back.out(1.4)",
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
    <section ref={sectionRef} className="py-24 px-4 sm:px-6 lg:px-8 relative bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div ref={headingRef} className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-foreground">
            Our Portfolio
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Showcasing our best work and success stories
          </p>
        </div>

        <div ref={itemsRef} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <div
              key={index}
              className="portfolio-item group relative overflow-hidden rounded-xl bg-card border border-border/50 h-64 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${project.color} opacity-50 group-hover:opacity-70 transition-opacity duration-300`}
              />

              <div className="relative h-full p-6 flex flex-col justify-end">
                <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-sm text-muted-foreground mb-2">
                    {project.category}
                  </p>
                  <h3 className="text-2xl font-display font-semibold mb-3 text-foreground">
                    {project.title}
                  </h3>
                  <div className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-sm font-medium">View Project</span>
                    <ExternalLink className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};