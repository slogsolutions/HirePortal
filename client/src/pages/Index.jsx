// import { Hero } from "@/components/Hero";
// import { About } from "@/components/About";
// import { Services } from "@/components/Services";
// import { Portfolio } from "@/components/Portfolio";
// import { Testimonials } from "@/components/Testimonials";
// import { CTA } from "@/components/CTA";

// const Index = () => {
//   return (
//     <div className="themeClass min-h-screen">
//       <Hero />
//       <About />
//       <Services />
//       <Portfolio />
//       <Testimonials />
//       <CTA />
//     </div>
//   );
// };

// export default Index;

import { useState } from "react";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import  Services  from "@/components/Services";
import { Portfolio } from "@/components/Portfolio";
import { Testimonials } from "@/components/Testimonials";
import { CTA } from "@/components/CTA";
import AnimationText from "@/components/AnimationText";

const Index = () => {
  const [isDark, setIsDark] = useState(false);

  return (
    <>
      <div className={`themeClass ${isDark ? "dark" : ""} min-h-screen`}>
        {/* optional toggle button placed in top-right (you can style it) */}
        <div className="fixed top-4 right-4 z-50">
          {/* <button
            onClick={() => setIsDark((s) => !s)}
            className="px-3 py-2 rounded-md border"
            aria-pressed={isDark}
          >
            {isDark ? "Switch to Light" : "Switch to Dark"}
          </button> */}
        </div>

        <Hero />
        <About />
        <Services />
        <Portfolio />
        <Testimonials />
       
        <CTA />
      </div>
    </>
  );
};

export default Index;
