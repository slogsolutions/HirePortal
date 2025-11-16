import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ExternalLink } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

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
  const sectionRef = useRef(null); // <-- Type <HTMLElement> removed here

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    gsap.from(".portfolio-heading", {
      scrollTrigger: {
        trigger: section,
        start: "top 80%",
      },
      y: 50,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
    });

    gsap.from(".portfolio-item", {
      scrollTrigger: {
        trigger: section,
        start: "top 70%",
      },
      scale: 0.8,
      opacity: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: "back.out(1.4)",
    });
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-4 relative bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="portfolio-heading text-4xl md:text-5xl font-display font-bold mb-4">
            Our Portfolio
          </h2>
          <p className="portfolio-heading text-xl text-muted-foreground max-w-2xl mx-auto">
            Showcasing our best work and success stories
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <div
              key={index}
              className="portfolio-item group relative overflow-hidden rounded-xl bg-card border border-border/50 h-64 cursor-pointer"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${project.color} opacity-50 group-hover:opacity-70 transition-opacity duration-300`}
              />

              <div className="relative h-full p-6 flex flex-col justify-end">
                <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                  <p className="text-sm text-muted-foreground mb-2">
                    {project.category}
                  </p>
                  <h3 className="text-2xl font-display font-semibold mb-3">
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