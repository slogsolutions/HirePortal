import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Sun,
  Moon,
  Briefcase,
  Globe,
  Heart,
  Clock,
  Users,
  Calendar,
  Award,
  MapPin,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ESM imports for leaflet marker images (no require)
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const INITIAL_CITIES = [
  { id: "mumbai", name: "Mumbai", lat: 19.076, lng: 72.8777, category: "project" },
  { id: "goa", name: "Goa", lat: 15.4929, lng: 73.8279, category: "project" },
  { id: "bengaluru", name: "Bengaluru", lat: 12.9716, lng: 77.5946, category: "project" },
  { id: "jaipur", name: "Jaipur", lat: 26.9124, lng: 75.7873, category: "project" },
  { id: "hyderabad", name: "Hyderabad", lat: 17.385, lng: 78.4867, category: "project" },
  { id: "leh", name: "Leh", lat: 34.1526, lng: 77.577, category: "project" },
  { id: "rishikesh", name: "Rishikesh", lat: 30.0869, lng: 78.2676, category: "project" },
  { id: "kolkata", name: "Kolkata", lat: 22.5726, lng: 88.3639, category: "center" },
  { id: "aizawl", name: "Aizawl", lat: 23.7271, lng: 92.7176, category: "center" },
  { id: "guwahati", name: "Guwahati", lat: 26.1445, lng: 91.7362, category: "center" },
  { id: "dehradun", name: "Dehradun", lat: 30.3165, lng: 78.0322, category: "center" },
  { id: "chandigarh", name: "Chandigarh", lat: 30.7333, lng: 76.7794, category: "center" },
  { id: "ahmedabad", name: "Ahmedabad", lat: 23.0225, lng: 72.5714, category: "center" },
];

export default function AboutUs() {
  const [dark, setDark] = useState(false);
  const center = [22.0, 80.0];
  const zoom = 5.25;

  return (
    <div className={`${dark ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"} min-h-screen transition-colors`}>
      {/* Theme Toggle */}
      <div className="fixed top-5 right-5 z-50">
        <button
          onClick={() => setDark(!dark)}
          className="p-2 rounded-full bg-opacity-90 backdrop-blur-sm shadow-lg flex items-center justify-center transition"
          aria-label="Toggle theme"
          style={{ background: dark ? "rgba(255,255,255,0.06)" : "rgba(17,24,39,0.8)" }}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* HERO */}
      <header className="relative h-[58vh] md:h-[64vh] flex items-center">
        <div className="absolute inset-0">
          <video
            className="w-full h-full object-cover opacity-35"
            autoPlay
            loop
            muted
            src="https://videos.pexels.com/video-files/853436/853436-sd_640_360_25fps.mp4"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>

        <div className="container mx-auto relative z-10 px-6">
          <motion.div initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7 }}>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold leading-tight max-w-4xl">
              Empowering hiring through elegant technology — <span className="text-blue-600 dark:text-blue-400">people first</span>.
            </h1>
            <p className="mt-4 text-lg md:text-xl max-w-2xl opacity-90">
              Slog Solutions builds fast, reliable hiring infrastructure — onboarding, verification, and interview orchestration — so companies and candidates move forward faster.
            </p>
            <div className="mt-6 flex gap-3">
              <a className="inline-block px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-medium shadow hover:opacity-95" href="/contact">
                Talk to Sales
              </a>
              <a className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border dark:border-gray-700 bg-white/80 dark:bg-gray-800/60" href="#who-we-are">
                Learn more
              </a>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto px-6 -mt-12">
        {/* Card hero summary */}
        <section id="who-we-are" className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800/60 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <Briefcase size={20} className="text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">What we do</h3>
                <p className="text-sm opacity-80 mt-1">End-to-end hiring workflow automation for enterprises and SMBs.</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800/60 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <Globe size={20} className="text-green-600 dark:text-green-300" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Where we work</h3>
                <p className="text-sm opacity-80 mt-1">Nationwide presence with regional centers and distributed teams (map below).</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800/60 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-pink-50 dark:bg-pink-900/20">
                <Heart size={20} className="text-pink-600 dark:text-pink-300" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Why we care</h3>
                <p className="text-sm opacity-80 mt-1">Human-focused hiring: faster placements with dignity and clarity for candidates.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Beautiful divider */}
        <div className="my-10">
          <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:from-transparent dark:via-gray-700 dark:to-transparent" />
        </div>

        {/* Core Values + Stats */}
        <section className="grid md:grid-cols-2 gap-8 items-start">
          {/* Core Values */}
          <div className="space-y-6">
            <motion.h2 initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold">
              Core values
            </motion.h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <ValueCard icon={<Users size={18} />} title="People first" desc="Design processes that respect candidates and teams." />
              <ValueCard icon={<Clock size={18} />} title="Reliability" desc="Stable systems and predictable SLAs for enterprise scale." />
              <ValueCard icon={<Award size={18} />} title="Integrity" desc="Data security, transparency, and compliance at every step." />
              <ValueCard icon={<Calendar size={18} />} title="Iterate fast" desc="Ship minimal experiments and measure impact." />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatTile number="10K+" label="Employees Registered" />
              <StatTile number="500+" label="Companies Onboarded" />
            </div>
          </div>

          {/* History / Leadership */}
          <div className="space-y-6">
            <motion.h2 initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold">
              Our journey & leadership
            </motion.h2>

            {/* timeline horizontal on large screens */}
            <div className="bg-white/80 dark:bg-gray-800/60 p-4 rounded-2xl shadow">
              <ol className="flex flex-col md:flex-row md:gap-6 items-start md:items-center">
                <li className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">17</div>
                  <div>
                    <div className="font-semibold text-sm">2017 — Founded</div>
                    <div className="text-sm opacity-80">Small team, big ideas — started with onboarding automation.</div>
                  </div>
                </li>
                <li className="flex items-start gap-3 mt-4 md:mt-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center">19</div>
                  <div>
                    <div className="font-semibold text-sm">2019 — Platform</div>
                    <div className="text-sm opacity-80">First SaaS release: document workflows & verification.</div>
                  </div>
                </li>
                <li className="flex items-start gap-3 mt-4 md:mt-0">
                  <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center">21</div>
                  <div>
                    <div className="font-semibold text-sm">2021 — Scale</div>
                    <div className="text-sm opacity-80">Enterprise integrations and partnerships.</div>
                  </div>
                </li>
              </ol>
            </div>

            {/* Leadership cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LeaderCard name="Asha Menon" title="Founder & CEO" bio="Leads product and customer strategy. Ex-HR lead at a fintech unicorn." />
              <LeaderCard name="Rohit Kapoor" title="CTO" bio="Heads engineering — reliability, infra, and platform architecture." />
            </div>
          </div>
        </section>

        {/* Promise / CTA */}
        <section className="mt-10 grid md:grid-cols-3 gap-6 items-stretch">
          <div className="col-span-2 p-6 rounded-2xl bg-gradient-to-r from-white/80 to-blue-50 dark:from-gray-800/60 dark:to-gray-900/40 shadow">
            <h3 className="text-xl font-semibold flex items-center gap-2"><MapPin size={18} /> Our commitment</h3>
            <p className="mt-2 text-sm opacity-90">
              We measure success by outcomes — reduced time-to-hire, fewer manual steps, and a respectful experience for every candidate.
              We don’t ship features that don't move the needle.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/90 dark:bg-gray-800/60 shadow flex flex-col justify-between">
            <div>
              <h4 className="font-semibold">Careers</h4>
              <p className="text-sm opacity-80 mt-2">Growing team — engineering, product, and customer success roles open.</p>
            </div>
            <a href="/careers" className="mt-4 inline-block rounded-md px-4 py-2 bg-blue-600 text-white text-center">See openings</a>
          </div>
        </section>

        {/* MAP SECTION — left untouched as requested */}
        <section className="mt-12 max-w-7xl mx-auto px-0 pb-20">
          <h2 className="text-3xl font-bold mb-4 text-center text-blue-600 dark:text-blue-400">
            Our Presence Across India
          </h2>
          <p className="text-center mb-6 opacity-80">
            Explore where Slog Solutions is operating and collaborating with businesses nationwide.
          </p>

          <div className="relative w-full h-[600px] bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg">
            <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
              {dark ? (
                <TileLayer
                  attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors'
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
              ) : (
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              )}

              {INITIAL_CITIES.map((c) => (
                <Marker key={c.id} position={[c.lat, c.lng]}>
                  <Popup>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-sm opacity-80">
                      {c.category === "project" ? "Project Location" : "Center"}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-sm opacity-70 border-t border-gray-200 dark:border-gray-700 mt-6">
        © {new Date().getFullYear()} Slog Solutions Pvt. Ltd. — All rights reserved
      </footer>
    </div>
  );
}

/* ----------------- Small presentational components ----------------- */

function ValueCard({ icon, title, desc }) {
  return (
    <div className="p-4 rounded-lg border dark:border-gray-700 bg-white/80 dark:bg-gray-800/50">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20">{icon}</div>
        <div>
          <div className="font-semibold">{title}</div>
          <div className="text-sm mt-1 opacity-80">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ number, label }) {
  return (
    <div className="p-4 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow">
      <div className="text-2xl font-bold">{number}</div>
      <div className="text-sm mt-1 opacity-90">{label}</div>
    </div>
  );
}

function LeaderCard({ name, title, bio }) {
  return (
    <div className="p-4 rounded-lg bg-white/90 dark:bg-gray-800/60 border shadow">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
          {getInitials(name)}
        </div>
        <div>
          <div className="font-semibold">{name}</div>
          <div className="text-sm opacity-80">{title}</div>
        </div>
      </div>
      <p className="text-sm opacity-85 mt-3">{bio}</p>
    </div>
  );
}

function getInitials(fullName) {
  return fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
