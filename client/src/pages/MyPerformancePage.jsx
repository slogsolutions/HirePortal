import React, { useEffect, useState, useMemo } from "react";
import api from "../api/axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaCrown,
  FaChartLine,
  FaMedal,
  FaUserAstronaut,
  FaStar,
  FaTrophy,
  FaComments,
  FaCalendarAlt
} from "react-icons/fa";
import { format } from "date-fns";

/* ---------------- Stars ---------------- */
function Stars({ value }) {
  const v = Math.max(0, Math.min(5, Number(value || 0)));
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(i => (
        <FaStar key={i} className={i <= v ? "text-yellow-400" : "text-gray-300"} />
      ))}
      <span className="ml-2 text-sm text-gray-400">{v.toFixed(1)}/5</span>
    </div>
  );
}

/* ---------------- Avatar with Initials ---------------- */
function Avatar({ src, name, size = "w-24 h-24", className = "" }) {
  const [imgError, setImgError] = useState(false);
  
  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(name);
  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500", 
    "bg-indigo-500", "bg-yellow-500", "bg-red-500", "bg-teal-500"
  ];
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;

  if (src && !imgError) {
    return (
      <img 
        src={src} 
        alt={name || "User"} 
        className={`${size} rounded-full object-cover ${className}`}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div 
      className={`${size} rounded-full ${colors[colorIndex]} flex items-center justify-center text-white font-bold text-lg shadow-lg ${className}`}
    >
      {initials}
    </div>
  );
}

/* ---------------- Rank System ---------------- */
function getRank(avg) {
  if (avg >= 4.5) return { name: "Platinum", icon: <FaCrown />, color: "from-purple-600 to-indigo-600" };
  if (avg >= 4) return { name: "Gold", icon: <FaMedal />, color: "from-yellow-400 to-yellow-600" };
  if (avg >= 3) return { name: "Silver", icon: <FaMedal />, color: "from-gray-300 to-gray-500" };
  if (avg >= 2) return { name: "Bronze", icon: <FaMedal />, color: "from-orange-400 to-orange-600" };
  return { name: "Iron", icon: <FaUserAstronaut />, color: "from-slate-600 to-slate-800" };
}

export default function MyPerformancePage() {
  const [profile, setProfile] = useState(null);
  const [performances, setPerformances] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showCelebration, setShowCelebration] = useState(true);

  useEffect(() => {
    loadAll();
    setTimeout(() => setShowCelebration(false), 3000);
  }, []);

  async function loadAll() {
    try {
      const pRes = await api.get("/candidates/me");
      setProfile(pRes.data.data || pRes.data);
    } catch (err) {
      console.error("Failed to load profile:", err);
    }

    try {
      const perfRes = await api.get("/performance/me");
      setPerformances(perfRes.data?.data || perfRes.data || []);
    } catch (err) {
      console.error("Failed to load performances:", err);
      setPerformances([]);
    }

    // 👑 TOP 3 Employees
    try {
      const lb = await api.get("/performance/leaderboard?limit=3");
      setLeaderboard(lb.data?.data || lb.data || []);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
      setLeaderboard([]);
    }
  }

  const stats = useMemo(() => {
    if (!performances.length) return { avg: 0, trend: "stable", latest: null };
    const scores = performances.map(p => Number(p.performanceScore || 0));
    const avg = scores.reduce((a,b)=>a+b,0)/scores.length;
    return {
      avg: Math.round(avg*10)/10,
      latest: performances[0],
      trend: scores[0] > scores[1] ? "up" : "stable"
    };
  }, [performances]);

  const rank = getRank(stats.avg);
  const photo = profile?.photoUrl || "https://via.placeholder.com/150";

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#020617] p-6 overflow-hidden">

      {/* Celebration */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 p-10 rounded-3xl text-white text-center shadow-2xl"
            >
              <h1 className="text-3xl font-bold mb-4">🎉 Welcome Back!</h1>
              <p>You are currently</p>
              <div className="text-4xl font-extrabold mt-2 flex items-center justify-center gap-2">
                {rank.icon} {rank.name}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white flex items-center gap-3">
        <FaChartLine /> Performance Hub
      </h1>

      {/* Profile */}
      {profile && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow flex flex-wrap gap-6 items-center">
          <Avatar 
            src={profile?.photoUrl} 
            name={`${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || profile?.fullName}
            size="w-24 h-24"
            className="border-4 border-indigo-500"
          />
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-xl font-semibold dark:text-white">
              {`${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || profile?.fullName || "Employee"}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">{profile?.Designation || "Employee"}</p>
            <div className="mt-2">
              <Stars value={stats.avg}/>
            </div>
          </div>
          <div className={`px-6 py-3 rounded-xl text-white bg-gradient-to-r ${rank.color}`}>
            <div className="text-xl font-bold flex items-center gap-2">{rank.icon} {rank.name}</div>
          </div>
        </div>
      )}

      {/* Podium Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <FaTrophy className="text-yellow-500" /> Top Performers
          </h2>
          
          <div className="flex items-end justify-center gap-4 md:gap-8 mb-8">
            {/* 2nd Place - Left */}
            {leaderboard[1] && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-4">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-gray-300 dark:border-gray-600 overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-lg relative">
                    <Avatar 
                      src={leaderboard[1].photoUrl} 
                      name={leaderboard[1].name}
                      size="w-full h-full"
                    />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-gray-400 dark:bg-gray-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-md z-10">
                    2
                  </div>
                </div>
                <div className="bg-gray-300 dark:bg-gray-700 w-32 md:w-40 h-24 md:h-32 rounded-t-lg shadow-xl flex flex-col items-center justify-center pt-2 px-2">
                  <h3 className="font-bold text-sm md:text-base dark:text-white text-center break-words">{leaderboard[1].name || "N/A"}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-1">{leaderboard[1].designation || ""}</p>
                  <div className="mt-1 flex justify-center">
                    <Stars value={leaderboard[1].avgScore || 0} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 1st Place - Center (Highest) */}
            {leaderboard[0] && (
              <motion.div
                initial={{ y: 100, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.6, type: "spring" }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-4">
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-full border-4 border-yellow-400 overflow-hidden bg-yellow-100 dark:bg-yellow-900/30 shadow-2xl ring-4 ring-yellow-300 dark:ring-yellow-600 relative">
                    <Avatar 
                      src={leaderboard[0].photoUrl} 
                      name={leaderboard[0].name}
                      size="w-full h-full"
                    />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg z-10">
                    1
                  </div>
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10"
                  >
                    <FaCrown className="text-yellow-400 text-2xl" />
                  </motion.div>
                </div>
                <div className="bg-gradient-to-b from-yellow-400 to-yellow-600 dark:from-yellow-500 dark:to-yellow-700 w-36 md:w-48 h-32 md:h-40 rounded-t-lg shadow-2xl flex flex-col items-center justify-center pt-2 px-2">
                  <h3 className="font-bold text-base md:text-lg text-white text-center break-words">{leaderboard[0].name || "N/A"}</h3>
                  <p className="text-xs text-yellow-100 text-center mt-1">{leaderboard[0].designation || ""}</p>
                  <div className="mt-1 flex justify-center">
                    <Stars value={leaderboard[0].avgScore || 0} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3rd Place - Right */}
            {leaderboard[2] && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
                className="flex flex-col items-center"
              >
                <div className="relative mb-4">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-orange-300 dark:border-orange-700 overflow-hidden bg-orange-200 dark:bg-orange-900/30 shadow-lg relative">
                    <Avatar 
                      src={leaderboard[2].photoUrl} 
                      name={leaderboard[2].name}
                      size="w-full h-full"
                    />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-orange-500 dark:bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-md z-10">
                    3
                  </div>
                </div>
                <div className="bg-orange-400 dark:bg-orange-600 w-32 md:w-40 h-20 md:h-24 rounded-t-lg shadow-xl flex flex-col items-center justify-center pt-2 px-2">
                  <h3 className="font-bold text-sm md:text-base text-white text-center break-words">{leaderboard[2].name || "N/A"}</h3>
                  <p className="text-xs text-orange-100 text-center mt-1">{leaderboard[2].designation || ""}</p>
                  <div className="mt-1 flex justify-center">
                    <Stars value={leaderboard[2].avgScore || 0} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Performance History Chart */}
      {performances.length > 0 && (
        <div className="mt-10 bg-white dark:bg-slate-900 p-6 rounded-xl shadow">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <FaChartLine /> Performance Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={[...performances].reverse().map((p, idx) => ({
              date: p.createdAt ? format(new Date(p.createdAt), "MMM dd") : p.period || `Review ${idx + 1}`,
              score: Number(p.performanceScore || 0)
            }))}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                stroke="currentColor"
              />
              <YAxis 
                domain={[0, 5]}
                className="text-xs"
                stroke="currentColor"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "rgba(0,0,0,0.8)", 
                  border: "none",
                  borderRadius: "8px",
                  color: "white"
                }}
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#6366f1" 
                strokeWidth={3}
                dot={{ fill: "#6366f1", r: 5 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Performance Reviews & Feedback */}
      {performances.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <FaComments /> Performance Reviews & Feedback
          </h2>
          <div className="space-y-4">
            {performances.map((perf, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <FaCalendarAlt className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Review #{performances.length - idx}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {perf.createdAt 
                          ? format(new Date(perf.createdAt), "MMMM dd, yyyy")
                          : perf.period || "Date not available"}
                      </p>
                      {perf.period && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Period: {perf.period}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {Number(perf.performanceScore || 0).toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">/ 5.0</div>
                    <div className="mt-1 flex justify-end">
                      <Stars value={perf.performanceScore || 0} />
                    </div>
                  </div>
                </div>

                {perf.feedback && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Feedback:</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {perf.feedback}
                    </p>
                  </div>
                )}

                {perf.reviewer && (
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      Reviewed by: <span className="font-semibold">{perf.reviewer?.name || perf.reviewer?.email || "Unknown"}</span>
                    </span>
                    {perf.nextReview && (
                      <span>
                        Next review: {format(new Date(perf.nextReview), "MMM dd, yyyy")}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {performances.length === 0 && !profile && (
        <div className="mt-10 text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No performance data available yet.</p>
        </div>
      )}

    </div>
  );
}
