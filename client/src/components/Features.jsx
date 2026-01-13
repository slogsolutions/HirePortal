import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Zap, Shield, Rocket, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}


const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Experience unparalleled speed with our optimized infrastructure built for performance.",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description: "Enterprise-grade security ensures your data is protected with industry-leading protocols.",
  },
  {
    icon: Rocket,
    title: "Scale Effortlessly",
    description: "Grow your business without limits. Our platform scales seamlessly with your needs.",
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Connect with customers worldwide through our distributed network infrastructure.",
  },
];

export const Features = () => {
  const sectionRef = useRef(null); // <-- Type <HTMLElement> removed here

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    gsap.from(".features-heading", {
      scrollTrigger: {
        trigger: section,
        start: "top 80%",
      },
      y: 50,
      opacity: 0,
      duration: 1,
      ease: "power3.out",
    });

    gsap.from(".feature-card", {
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
    <section ref={sectionRef} className="py-24 px-4 relative">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="features-heading text-4xl md:text-5xl font-display font-bold mb-4">
            Powerful Features
          </h2>
          <p className="features-heading text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything you need to succeed in the modern digital landscape
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="feature-card group hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 bg-card/50 backdrop-blur-sm"
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};