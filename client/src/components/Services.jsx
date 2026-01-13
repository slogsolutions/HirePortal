import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}


export default function SlogCreativePinned() {
  const pinRef = useRef(null);

  useGSAP(() => {
    // Horizontal Scroll
    gsap.to(".slogTitle", {
      xPercent: -80,
      scrollTrigger: {
        trigger: pinRef.current,
        start: "top top",
        end: "+=300%",
        scrub: 2,
        pin: true,
      },
    });

    // Sticker Floating Animation
    gsap.to(".sticker", {
      y: 20,
      rotate: 5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      duration: 2.5,
    });

    ScrollTrigger.refresh();
  }, []);

  return (
    <section
      ref={pinRef}
      className="h-screen relative overflow-hidden flex items-center"
      style={{
        background: "#a9ced9",
      }}
    >
      {/* HUGE TEXT */}
      <h1
        className="slogTitle"
        style={{
          fontSize: "60vh",
          fontWeight: "900",
          letterSpacing: "-8px",
          color: "#111",
          whiteSpace: "nowrap",
          marginLeft: "20vw",
        }}
      >
        SLOG SOLUTIONS
      </h1>

      {/* Stickers */}
      <div className="sticker absolute bottom-24 left-20 bg-pink-200 border-4 border-black rounded-full px-8 py-4 text-2xl font-bold">
        Defence
      </div>

      <div className="sticker absolute top-16 right-40 bg-yellow-300 border-4 border-black rounded-full px-8 py-3 text-xl font-bold">
        Government
      </div>

      <div className="sticker absolute top-1/10 left-1/7 -translate-x-1/2 -translate-y-1/2 rotate-[-8deg]">
  <div className="
      w-[240px] h-[240px]
      bg-white
      border-[6px] border-black
      rounded-full
      shadow-[10px_10px_0px_#000]
      flex flex-col items-center justify-center
      text-center
      relative
  ">
    <span className="text-[22px] font-extrabold tracking-wide">
      CORPORATE
    </span>

    <span className="
      mt-2 text-sm font-bold
      bg-black text-white px-4 py-1
      rounded-full border-[3px] border-black
    ">
      TRAINING
    </span>

    {/* inner ring */}
    <div className="
      absolute inset-4 border-[3px] border-black rounded-full
    "></div>
  </div>
</div>


      <div
        className="
    sticker absolute bottom-10 right-10
    px-12 py-6 text-xl font-bold
    bg-green-300 border-[4px] border-black
    text-black
    shadow-[6px_6px_0px_#000]
    rotate-[-6deg]
  "
        style={{
          borderRadius: "40% 60% 55% 45% / 60% 40% 60% 40%",
        }}
      >
        Innovation
      </div>
    </section>
  );
}
