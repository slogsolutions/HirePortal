import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Code,
  Palette,
  Megaphone,
  LineChart,
  Shield,
  Cloud,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

gsap.registerPlugin(ScrollTrigger);

const services = [
  {
    icon: Code,
    title: "Web Development",
    description: "Custom web applications built with modern technologies and best practices.",
  },
  {
    icon: Palette,
    title: "UI/UX Design",
    description: "Beautiful, intuitive interfaces that users love and understand instantly.",
  },
  {
    icon: Megaphone,
    title: "Digital Marketing",
    description: "Strategic campaigns that drive traffic, engagement, and conversions.",
  },
  {
    icon: LineChart,
    title: "Data Analytics",
    description: "Transform data into actionable insights for smarter business decisions.",
  },
  {
    icon: Shield,
    title: "Cybersecurity",
    description: "Protect your business with enterprise-grade security solutions.",
  },
  {
    icon: Cloud,
    title: "Cloud Solutions",
    description: "Scalable cloud infrastructure that grows with your business needs.",
  },
];

export const Services = () => {
  const sectionRef = useRef(null); // <-- Type <HTMLElement> removed here

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    gsap.from(".services-heading", {
      scrollTrigger: {
        trigger: section,
        start: "top 80%",
      },
      y: 50,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
    });

    gsap.from(".service-card", {
      scrollTrigger: {
        trigger: section,
        start: "top 70%",
      },
      y: 100,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out",
    });
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="services-heading text-4xl md:text-5xl font-display font-bold mb-4">
            Our Services
          </h2>
          <p className="services-heading text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive solutions tailored to your business needs
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <Card
              key={index}
              className="service-card group hover:border-primary/50 transition-all duration-300 bg-card/50 backdrop-blur-sm cursor-pointer"
            >
              <CardContent className="p-6">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                  <service.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-3">
                  {service.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};