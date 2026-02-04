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
  FaCalendarAlt,
  FaExclamationTriangle
} from "react-icons/fa";
import { format } from "date-fns";

/* ---------------- Stars ---------------- */
function Stars({ value }) {
  const v = Math.max(0, Math.min(5, Number(value || 0)));
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
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

/* ---------------- Rank System with Taglines ---------------- */
function getRank(avg, hasWarning = false) {
  // Determine league/tier based on average (ignore warning for league)
  let league = {};
  if (avg >= 4.5) {
    league = {
      name: "Platinum",
      tagline: "Exceptional performance — you set the benchmark for others.",
      icon: <FaCrown />,
      color: "from-purple-600 to-indigo-600"
    };
  } else if (avg >= 4) {
    league = {
      name: "Gold",
      tagline: "Strong performance with reliable results.",
      icon: <FaMedal />,
      color: "from-yellow-400 to-yellow-600"
    };
  } else if (avg >= 3) {
    league = {
      name: "Silver",
      tagline: "You met the basic expectations for this period.",
      icon: <FaMedal />,
      color: "from-gray-300 to-gray-500"
    };
  } else {
    league = {
      name: "Iron",
      tagline: avg >= 2
        ? "Performance needs improvement; support and guidance are recommended."
        : "Immediate improvement is required to continue in the role.",
      icon: <FaUserAstronaut />,
      color: "from-slate-600 to-slate-800"
    };
  }

  return {
    ...league,
    hasWarning
  };
}

export default function MyPerformancePage() {
  const [profile, setProfile] = useState(null);
  const [performances, setPerformances] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showCelebration, setShowCelebration] = useState(true);

  // NEW: Cycle-based state
  const [currentCycle, setCurrentCycle] = useState(null);
  const [selectedCycleId, setSelectedCycleId] = useState(null);
  const [availableCycles, setAvailableCycles] = useState([]);
  const [monthlySummaries, setMonthlySummaries] = useState([]);
  const [cycleSummary, setCycleSummary] = useState(null);
  const [companyStats, setCompanyStats] = useState(null); // NEW: Company-wide stats

  useEffect(() => {
    loadAll();
    loadPerformanceData();
    setTimeout(() => setShowCelebration(false), 3000);
  }, []);

  useEffect(() => {
    if (selectedCycleId) {
      loadPerformanceData(selectedCycleId);
    }
  }, [selectedCycleId]);

  async function loadAll() {
    try {
      const pRes = await api.get("/candidates/me");
      setProfile(pRes.data.data || pRes.data);
    } catch (err) {
      console.error("Failed to load profile:", err);
    }

    // Load leaderboard
    try {
      const lb = await api.get("/performance/leaderboard?limit=3");
      setLeaderboard(lb.data?.data || lb.data || []);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
      setLeaderboard([]);
    }
  }

  async function loadPerformanceData(cycleId = null) {
    try {
      const url = cycleId ? `/performance/me?cycleId=${cycleId}` : '/performance/me';
      const perfRes = await api.get(url);

      const data = perfRes.data?.data || {};
      setCurrentCycle(data.currentCycle || null);
      setPerformances(data.reviews || []);
      setMonthlySummaries(data.monthlySummaries || []);
      setCycleSummary(data.cycleSummary || null);
      setAvailableCycles(data.availableCycles || []);

      // Set selected cycle if not set
      if (!selectedCycleId && data.currentCycle) {
        setSelectedCycleId(data.currentCycle._id);
      }

      // Load company-wide stats for the cycle
      if (cycleId || data.currentCycle) {
        loadCompanyStats(cycleId || data.currentCycle._id);
      }
    } catch (err) {
      console.error("Failed to load performance data:", err);
      setPerformances([]);
    }
  }

  async function loadCompanyStats(cycleId) {
    try {
      const res = await api.get(`/performance?cycleId=${cycleId}`);
      const allPerformances = res.data?.data || [];

      // Calculate company-wide statistics
      const stats = {
        totalReviews: allPerformances.length,
        totalPenalties: allPerformances.reduce((sum, p) => sum + (p.penaltyAmount || 0), 0),
        totalIncentives: allPerformances.reduce((sum, p) => sum + (p.incentiveAmount || 0), 0),
        uniqueEmployees: new Set(allPerformances.map(p => p.employee?._id || p.employee)).size,
      };

      setCompanyStats(stats);
    } catch (err) {
      console.error("Failed to load company stats:", err);
      setCompanyStats(null);
    }
  }

  const stats = useMemo(() => {
    if (!performances.length) return { avg: 0, trend: "stable", latest: null };
    const scores = performances.map(p => Number(p.performanceScore || 0));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return {
      avg: Math.round(avg * 10) / 10,
      latest: performances[0],
      trend: scores[0] > scores[1] ? "up" : "stable",
      totalIncentives: performances.reduce((sum, p) => sum + (p.incentiveAmount || 0), 0),
      totalPenalties: performances.reduce((sum, p) => sum + (p.penaltyAmount || 0), 0),
    };
  }, [performances]);

  stats.netAmount = stats.totalIncentives - stats.totalPenalties;

  // Determine rank with warning check
  const rank = getRank(
    cycleSummary?.ceilingAverageScore || stats.avg,
    cycleSummary?.hadNoticePeriodWarning || false
  );

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
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className={`bg-gradient-to-r ${rank.color} p-10 rounded-3xl text-white text-center shadow-2xl max-w-md w-full`}
            >
              <h1 className="text-3xl font-bold mb-4"> Welcome Back!</h1>
              <p className="text-lg mb-2">You are currently</p>
              <div className="text-4xl font-extrabold mt-2 mb-4 flex items-center justify-center gap-2">
                {rank.icon} {rank.name}
              </div>
              <p className="text-sm opacity-90 italic mb-4">
                {rank.tagline}
              </p>

              {/* Warning Message - shown AFTER league */}
              {rank.hasWarning && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 pt-6 border-t-2 border-white/30"
                >
                  <div className="bg-red-600 bg-opacity-50 backdrop-blur-sm p-4 rounded-xl">
                    <div className="flex items-center justify-center gap-2 text-xl font-bold mb-2">
                      <FaExclamationTriangle /> Notice Period Warning
                    </div>
                    <p className="text-sm">
                      Immediate improvement is required. Further HR review is required.
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white flex items-center gap-3">
        <FaChartLine /> Performance Hub
      </h1>

      {/* Cycle Selector */}
      {availableCycles.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow mb-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Select Performance Cycle
          </label>
          <select
            value={selectedCycleId || currentCycle?._id || ''}
            onChange={(e) => setSelectedCycleId(e.target.value)}
            className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:text-white"
          >
            {availableCycles.map((cycle) => (
              <option key={cycle._id} value={cycle._id}>
                Cycle {cycle.cycleNumber}: {format(new Date(cycle.startDate), 'MMM yyyy')} - {format(new Date(cycle.endDate), 'MMM yyyy')}
                {cycle.status === 'active' ? ' (Current)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Warning Banner */}
      {cycleSummary?.hadNoticePeriodWarning && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-100 border-2 border-red-500 rounded-xl p-6 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="text-5xl">
              <FaExclamationTriangle className="text-red-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-800 flex items-center gap-2">
                🚨 Notice Period Warning
              </h3>
              <p className="text-red-700 mt-2">
                You have received low performance ratings for 2 consecutive months.
                Please schedule a meeting with HR to discuss your performance improvement plan.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Cycle Summary Card */}
      {cycleSummary && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-6 rounded-xl shadow mb-6">
          <h3 className="text-xl font-bold mb-4 dark:text-white">Cycle Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Reviews</div>
              <div className="text-2xl font-bold dark:text-white">{cycleSummary.totalReviews}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Average Score</div>
              <div className="text-2xl font-bold dark:text-white">{cycleSummary.ceilingAverageScore}/5</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Incentives</div>
              <div className="text-2xl font-bold text-green-600">₹{cycleSummary.totalIncentives.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Penalties</div>
              <div className="text-2xl font-bold text-red-600">₹{cycleSummary.totalPenalties.toLocaleString()}</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Net Amount</div>
              <div className={`text-3xl font-bold ${cycleSummary.netAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                ₹{cycleSummary.netAmount.toLocaleString()}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">Performance Status</div>
              <div className="mt-1">
                {cycleSummary.hadNoticePeriodWarning ? (
                  <div className="flex flex-col gap-2">
                    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-500 text-white inline-flex items-center gap-2">
                      <FaExclamationTriangle /> Notice Period Can Be Initiated
                    </span>
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Due to consistent low performance (2 consecutive months with 1★), further HR review is required.
                    </p>
                  </div>
                ) : (
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${cycleSummary.finalPerformanceTag === 'Outstanding' ? 'bg-green-500 text-white' :
                      cycleSummary.finalPerformanceTag === 'Very Good' ? 'bg-blue-500 text-white' :
                        cycleSummary.finalPerformanceTag === 'Average' ? 'bg-yellow-500 text-white' :
                          cycleSummary.finalPerformanceTag === 'Below Average' ? 'bg-orange-500 text-white' :
                            'bg-red-500 text-white'
                    }`}>
                    {cycleSummary.finalPerformanceTag}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Company-Wide Statistics */}
      {companyStats && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-6 rounded-xl shadow mb-6 border-2 border-orange-200 dark:border-orange-800">
          <h3 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
            <FaTrophy className="text-orange-500" /> Company Performance Stats
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Employees Reviewed</div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {companyStats.uniqueEmployees}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {companyStats.totalReviews} total reviews
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Incentives Paid</div>
              <div className="text-2xl font-bold text-green-600">
                ₹{companyStats.totalIncentives.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Company-wide rewards
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border-2 border-red-300 dark:border-red-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Penalties Collected</div>
              <div className="text-2xl font-bold text-red-600">
                ₹{companyStats.totalPenalties.toLocaleString()}
              </div>
              <div className="text-xs text-red-500 dark:text-red-400 mt-1 font-semibold">
                This amount will be allocated towards employee welfare
              </div>
            </div>
          </div>
        </div>
      )}

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
              <Stars value={stats.avg} />
            </div>
          </div>
          <div className={`px-6 py-3 rounded-xl text-white bg-gradient-to-r ${rank.color} max-w-sm`}>
            <div className="text-xl font-bold flex items-center gap-2 mb-2">{rank.icon} {rank.name}</div>
            <p className="text-xs opacity-90 italic">{rank.tagline}</p>
          </div>
        </div>
      )}

      {/* Podium Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <FaTrophy className="text-yellow-500" /> Top Performers League
          </h2>

          <div className="flex items-end justify-center gap-4 md:gap-8 mb-8">
            {/* 2nd Place - Gold - Left */}
            {leaderboard[1] && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
                className="flex flex-col items-center"
              >
                {/* League Badge */}
                <div className="mb-3 px-4 py-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full shadow-lg">
                  <span className="text-white font-bold text-sm flex items-center gap-1">
                    <FaMedal /> GOLD
                  </span>
                </div>
                
                <div className="relative mb-4">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-yellow-400 overflow-hidden bg-yellow-100 dark:bg-yellow-900/30 shadow-2xl ring-4 ring-yellow-300 dark:ring-yellow-600 relative">
                    <Avatar
                      src={leaderboard[1].photoUrl}
                      name={leaderboard[1].name}
                      size="w-full h-full"
                    />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg z-10 border-2 border-white">
                    2
                  </div>
                </div>
                
                <div className="bg-gradient-to-b from-yellow-400 to-yellow-600 dark:from-yellow-500 dark:to-yellow-700 w-36 md:w-44 h-28 md:h-36 rounded-t-lg shadow-2xl flex flex-col items-center justify-center pt-2 px-2 relative overflow-hidden">
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  
                  <h3 className="font-bold text-sm md:text-base text-white text-center break-words relative z-10">
                    {leaderboard[1].name || "N/A"}
                  </h3>
                  <p className="text-xs text-yellow-100 text-center mt-1 relative z-10">
                    {leaderboard[1].designation || ""}
                  </p>
                  <div className="mt-2 flex justify-center relative z-10">
                    <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                      <Stars value={leaderboard[1].avgScore || 0} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 1st Place - Platinum - Center (Highest) */}
            {leaderboard[0] && (
              <motion.div
                initial={{ y: 100, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.6, type: "spring" }}
                className="flex flex-col items-center"
              >
                {/* League Badge */}
                <div className="mb-3 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-2xl animate-pulse">
                  <span className="text-white font-bold text-base flex items-center gap-2">
                    <FaCrown className="text-yellow-300" /> PLATINUM
                  </span>
                </div>
                
                <div className="relative mb-4">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-purple-400 overflow-hidden bg-purple-100 dark:bg-purple-900/30 shadow-2xl ring-8 ring-purple-300 dark:ring-purple-600 relative">
                    <Avatar
                      src={leaderboard[0].photoUrl}
                      name={leaderboard[0].name}
                      size="w-full h-full"
                    />
                  </div>
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-2xl z-10 border-4 border-white">
                    1
                  </div>
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                    className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10"
                  >
                    <FaCrown className="text-yellow-400 text-3xl drop-shadow-lg" />
                  </motion.div>
                  
                  {/* Sparkle effects */}
                  <motion.div
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                    className="absolute top-0 right-0 text-yellow-400 text-xl"
                  >
                    ✨
                  </motion.div>
                  <motion.div
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    className="absolute bottom-0 left-0 text-yellow-400 text-xl"
                  >
                    ✨
                  </motion.div>
                </div>
                
                <div className="bg-gradient-to-b from-purple-500 via-purple-600 to-indigo-700 dark:from-purple-600 dark:to-indigo-800 w-40 md:w-52 h-36 md:h-44 rounded-t-lg shadow-2xl flex flex-col items-center justify-center pt-2 px-2 relative overflow-hidden">
                  {/* Animated shine effect */}
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  ></motion.div>
                  
                  <h3 className="font-bold text-lg md:text-xl text-white text-center break-words relative z-10 drop-shadow-lg">
                    {leaderboard[0].name || "N/A"}
                  </h3>
                  <p className="text-sm text-purple-100 text-center mt-1 relative z-10">
                    {leaderboard[0].designation || ""}
                  </p>
                  <div className="mt-2 flex justify-center relative z-10">
                    <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      <Stars value={leaderboard[0].avgScore || 0} />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-purple-200 font-semibold relative z-10">
                    🏆 Champion
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3rd Place - Silver - Right */}
            {leaderboard[2] && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6, type: "spring" }}
                className="flex flex-col items-center"
              >
                {/* League Badge */}
                <div className="mb-3 px-4 py-1 bg-gradient-to-r from-gray-300 to-gray-500 rounded-full shadow-lg">
                  <span className="text-white font-bold text-sm flex items-center gap-1">
                    <FaMedal /> SILVER
                  </span>
                </div>
                
                <div className="relative mb-4">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-gray-300 dark:border-gray-600 overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-2xl ring-4 ring-gray-300 dark:ring-gray-600 relative">
                    <Avatar
                      src={leaderboard[2].photoUrl}
                      name={leaderboard[2].name}
                      size="w-full h-full"
                    />
                  </div>
                  <div className="absolute -top-2 -right-2 bg-gray-500 dark:bg-gray-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold shadow-lg z-10 border-2 border-white">
                    3
                  </div>
                </div>
                
                <div className="bg-gradient-to-b from-gray-300 to-gray-500 dark:from-gray-600 dark:to-gray-800 w-36 md:w-44 h-24 md:h-28 rounded-t-lg shadow-2xl flex flex-col items-center justify-center pt-2 px-2 relative overflow-hidden">
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                  
                  <h3 className="font-bold text-sm md:text-base text-white text-center break-words relative z-10">
                    {leaderboard[2].name || "N/A"}
                  </h3>
                  <p className="text-xs text-gray-100 text-center mt-1 relative z-10">
                    {leaderboard[2].designation || ""}
                  </p>
                  <div className="mt-2 flex justify-center relative z-10">
                    <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                      <Stars value={leaderboard[2].avgScore || 0} />
                    </div>
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

      {/* Financial Analytics - Incentives & Penalties */}
      {performances.length > 0 && (
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incentives vs Penalties Over Time */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow">
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              💰 Incentives vs Penalties
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[...performances].reverse().map((p, idx) => ({
                date: p.reviewForMonth ? format(new Date(p.reviewForMonth), "MMM yyyy") : `Review ${idx + 1}`,
                incentive: p.incentiveAmount || 0,
                penalty: p.penaltyAmount || 0,
                net: (p.incentiveAmount || 0) - (p.penaltyAmount || 0)
              }))}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  stroke="currentColor"
                />
                <YAxis
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
                  formatter={(value) => `₹${value.toLocaleString()}`}
                />
                <Line
                  type="monotone"
                  dataKey="incentive"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 4 }}
                  name="Incentive"
                />
                <Line
                  type="monotone"
                  dataKey="penalty"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: "#ef4444", r: 4 }}
                  name="Penalty"
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ fill: "#6366f1", r: 5 }}
                  name="Net Amount"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Cumulative Financial Summary */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow">
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              📊 Cumulative Earnings
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[...performances].reverse().reduce((acc, p, idx) => {
                const prev = acc[idx - 1] || { cumIncentive: 0, cumPenalty: 0, cumNet: 0 };
                acc.push({
                  date: p.reviewForMonth ? format(new Date(p.reviewForMonth), "MMM yyyy") : `Review ${idx + 1}`,
                  cumIncentive: prev.cumIncentive + (p.incentiveAmount || 0),
                  cumPenalty: prev.cumPenalty + (p.penaltyAmount || 0),
                  cumNet: prev.cumNet + ((p.incentiveAmount || 0) - (p.penaltyAmount || 0))
                });
                return acc;
              }, [])}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  stroke="currentColor"
                />
                <YAxis
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
                  formatter={(value) => `₹${value.toLocaleString()}`}
                />
                <Line
                  type="monotone"
                  dataKey="cumIncentive"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 4 }}
                  name="Total Incentives"
                />
                <Line
                  type="monotone"
                  dataKey="cumPenalty"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: "#ef4444", r: 4 }}
                  name="Total Penalties"
                />
                <Line
                  type="monotone"
                  dataKey="cumNet"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ fill: "#6366f1", r: 5 }}
                  name="Net Cumulative"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
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
                      <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        For: {perf.reviewForMonth ? format(new Date(perf.reviewForMonth), 'MMMM yyyy') : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Given on: {perf.reviewDate ? format(new Date(perf.reviewDate), 'MMM dd, yyyy') : 'N/A'}
                      </p>
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
                    <div className="mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${perf.performanceTag === 'Outstanding' ? 'bg-green-500 text-white' :
                          perf.performanceTag === 'Very Good' ? 'bg-blue-500 text-white' :
                            perf.performanceTag === 'Average' ? 'bg-yellow-500 text-white' :
                              perf.performanceTag === 'Below Average' ? 'bg-orange-500 text-white' :
                                'bg-red-500 text-white'
                        }`}>
                        {perf.performanceTag || 'Average'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Info */}
                <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg mb-3">
                  <div className="flex justify-between text-sm flex-wrap gap-2">
                    {perf.incentiveAmount > 0 && (
                      <span className="text-green-600 font-semibold">
                        Incentive: +₹{perf.incentiveAmount.toLocaleString()}
                      </span>
                    )}
                    {perf.penaltyAmount > 0 && (
                      <span className="text-red-600 font-semibold">
                        Penalty: -₹{perf.penaltyAmount.toLocaleString()}
                      </span>
                    )}
                    <span className={`font-bold ${((perf.incentiveAmount || 0) - (perf.penaltyAmount || 0)) >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                      Net: ₹{((perf.incentiveAmount || 0) - (perf.penaltyAmount || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Feedback */}
                {perf.feedback && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Feedback:</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {perf.feedback}
                    </p>
                  </div>
                )}

                {/* Override Info */}
                {perf.overrideReason && (
                  <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-xs text-blue-700 dark:text-blue-400">
                      <strong>Note:</strong> Financial amounts were adjusted. Reason: {perf.overrideReason}
                    </div>
                  </div>
                )}

                {/* Reviewer Info */}
                {perf.reviewer && (
                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Reviewed by: <span className="font-semibold">{perf.reviewer?.name || perf.reviewer?.email || "Unknown"}</span>
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
