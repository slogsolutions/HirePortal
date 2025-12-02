import { Briefcase, Users, CalendarCheck, BarChart3, ShieldCheck, Rocket, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="font-sans bg-gray-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* 🌟 Hero Section with video background */}
      <section className="relative overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="relative z-10 flex flex-col items-center justify-center text-center py-32 px-6">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight">
            Simplify <span className="text-yellow-300">Your Hiring</span> & Operations
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-200 max-w-2xl">
            Slog Solution Pvt Ltd internal portal streamlines recruitment, employee
            management, and project tracking in one unified system.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              className="bg-white text-blue-700 font-semibold px-6 py-3 rounded-full shadow hover:bg-blue-50 transition"
              onClick={() => navigate("/about-us")}
            >
              About Us
            </button>
            <button
              className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-full shadow hover:bg-blue-700 transition"
              onClick={() => navigate("/dashboard")}
            >
              View Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* 💼 Features */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-12">
            Why Slog Solution Hire Portal?
          </h2>
          <div className="grid md:grid-cols-4 sm:grid-cols-2 gap-10">
            <FeatureCard
              icon={<Briefcase className="w-10 h-10 text-blue-600" />}
              title="Recruitment Management"
              desc="Post jobs, track applicants, and manage interviews efficiently."
            />
            <FeatureCard
              icon={<Users className="w-10 h-10 text-blue-600" />}
              title="Employee Directory"
              desc="Centralized directory of all employees with role and team details."
            />
            <FeatureCard
              icon={<CalendarCheck className="w-10 h-10 text-blue-600" />}
              title="Task & Project Scheduler"
              desc="Assign tasks, track deadlines, and monitor project progress."
            />
            <FeatureCard
              icon={<BarChart3 className="w-10 h-10 text-blue-600" />}
              title="Analytics & Reports"
              desc="View performance metrics and generate detailed internal reports."
            />
            <FeatureCard
              icon={<ShieldCheck className="w-10 h-10 text-blue-600" />}
              title="Compliance Tracking"
              desc="Ensure all HR and operational processes follow internal policies."
            />
            <FeatureCard
              icon={<Rocket className="w-10 h-10 text-blue-600" />}
              title="Automation"
              desc="Automate repetitive tasks like reminders, approvals, and notifications."
            />
            <FeatureCard
              icon={<ClipboardList className="w-10 h-10 text-blue-600" />}
              title="Documentation & Policies"
              desc="Easy access to internal guidelines, policies, and forms."
            />
          </div>
        </div>
      </section>

      {/* 👥 Department Highlights */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-10 items-center px-6">
          <div className="bg-white rounded-2xl shadow-lg p-10 border">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">HR Management</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Centralize hiring, employee records, attendance, and appraisals all in one place.
            </p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition">
              Access HR Tools
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-10 border">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">Project Management</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Track tasks, assign resources, monitor timelines, and evaluate project performance.
            </p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition">
              View Projects
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-10 border">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">Analytics Dashboard</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Gain insights with internal analytics for employee productivity and operational efficiency.
            </p>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-full hover:bg-blue-700 transition">
              View Analytics
            </button>
          </div>
        </div>
      </section>

      {/* 🤝 Trusted Section */}
      <section className="py-20 bg-white text-center">
        <h2 className="text-3xl font-bold mb-10 text-slate-900 dark:text-slate-100">Used Across Departments</h2>
        <div className="flex flex-wrap justify-center gap-10 opacity-80">
          {['HR', 'Finance', 'Development', 'Marketing', 'Operations'].map((dept) => (
            <span key={dept} className="text-xl font-semibold text-gray-500 hover:text-blue-600 transition">
              {dept}
            </span>
          ))}
        </div>
      </section>

      {/* 🚀 CTA Banner */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-center text-white">
        <h2 className="text-4xl font-bold mb-4">Ready to Streamline Your Workflow?</h2>
        <p className="text-lg mb-8 opacity-90">
          Use Slog Solution Internal Portal to manage employees, projects, and tasks seamlessly.
        </p>
        <button className="bg-white text-blue-700 font-semibold px-8 py-4 rounded-full shadow hover:bg-blue-50 transition">
          Get Started Now
        </button>
      </section>

      {/* ⚫ Footer */}
      <footer className="bg-slate-950 text-slate-400 py-10 text-center text-sm">
        <p>© {new Date().getFullYear()} Slog Solution Pvt Ltd. All rights reserved.</p>
        <div className="mt-4 flex justify-center gap-6 text-slate-400">
          <a href="#" className="hover:text-slate-100">About</a>
          <a href="#" className="hover:text-slate-100">Departments</a>
          <a href="#" className="hover:text-slate-100">Blog</a>
          <a href="#" className="hover:text-slate-100">Contact</a>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-gray-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg transition rounded-2xl p-8 border text-left">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm">{desc}</p>
    </div>
  );
}