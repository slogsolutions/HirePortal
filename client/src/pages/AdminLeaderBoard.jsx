import React, { useEffect, useState } from "react";
import api from "../api/axios";
import { motion } from "framer-motion";
import {
  FaTrophy,
  FaMedal,
  FaCrown,
  FaStar,
  FaChartLine,
  FaCalendarAlt,
  FaArrowUp,
  FaArrowDown,
} from "react-icons/fa";
import { format, subMonths } from "date-fns";

/* ---------------- Avatar with Initials ---------------- */
function Avatar({ src, name, size = "w-12 h-12", className = "" }) {
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
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-teal-500",
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
      className={`${size} rounded-full ${colors[colorIndex]} flex items-center justify-center text-white font-bold text-sm shadow-md ${className}`}
    >
      {initials}
    </div>
  );
}

/* ---------------- Stars ---------------- */
function Stars({ value }) {
  const v = Math.max(0, Math.min(5, Number(value || 0)));
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <FaStar
          key={i}
          className={`text-xs ${
            i <= v ? "text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-gray-500">{v.toFixed(1)}</span>
    </div>
  );
}

/* ---------------- Rank Badge ---------------- */
function RankBadge({ rank }) {
  if (rank === 1) {
    return (
      <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white px-3 py-1 rounded-full text-sm font-bold">
        <FaCrown /> #{rank}
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center gap-1 bg-gradient-to-r from-gray-300 to-gray-500 text-white px-3 py-1 rounded-full text-sm font-bold">
        <FaMedal /> #{rank}
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center gap-1 bg-gradient-to-r from-orange-400 to-orange-600 text-white px-3 py-1 rounded-full text-sm font-bold">
        <FaMedal /> #{rank}
      </div>
    );
  }
  return (
    <div className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-semibold">
      #{rank}
    </div>
  );
}

export default function AdminLeaderBoard() {
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    if (selectedCycle) {
      loadLeaderboard();
    }
  }, [selectedCycle]);

  async function loadCycles() {
    setLoading(true);
    try {
      const res = await api.get("/performance/cycles");
      const cyclesData = res.data?.data || []; // Access res.data.data
      setCycles(cyclesData);

      // Set active cycle as default
      const activeCycle = cyclesData.find((c) => c.status === "active");
      if (activeCycle) {
        setSelectedCycle(activeCycle);
      } else if (cyclesData.length > 0) {
        setSelectedCycle(cyclesData[0]);
      }
    } catch (err) {
      console.error("Failed to load cycles:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadLeaderboard() {
    try {
      const res = await api.get(
        `/performance/leaderboard?cycleId=${selectedCycle._id}&limit=100`
      );
      const data = res.data?.data || [];

      // Format for display
      const formatted = data.map((emp, idx) => ({
        employeeId: emp.employeeId,
        name: emp.name,
        designation: emp.designation,
        photoUrl: emp.photoUrl,
        avgScore: emp.ceilingAverageScore || emp.averageScore,
        reviewCount: emp.totalReviews,
        rank: idx + 1,
        netAmount: emp.netAmount,
        hasWarnings: emp.hasWarnings,
      }));

      setLeaderboard(formatted);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-[#020617] p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading leaderboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#020617] p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
          <FaTrophy className="text-yellow-500" /> Leaderboard Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track employee performance rankings
        </p>
      </div>

      {/* Cycle Selector */}
      {cycles.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Select Cycle:
            </label>
            <select
              value={selectedCycle?._id || ""}
              onChange={(e) => {
                const cycle = cycles.find((c) => c._id === e.target.value);
                setSelectedCycle(cycle);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              {cycles.map((cycle) => (
                <option key={cycle._id} value={cycle._id}>
                  Cycle {cycle.cycleNumber} - {cycle.year} H{cycle.half} (
                  {cycle.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Overall Leaderboard */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FaChartLine className="text-indigo-600" /> Performance Rankings
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total Employees: {leaderboard.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Rank
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Employee
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Designation
                </th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Average Score
                </th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Reviews
                </th>
                <th className="text-center py-4 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Rating
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((emp, idx) => (
                <motion.tr
                  key={emp.employeeId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors ${
                    idx < 3
                      ? "bg-gradient-to-r from-yellow-50 to-transparent dark:from-yellow-900/10"
                      : ""
                  }`}
                >
                  <td className="py-4 px-4">
                    <RankBadge rank={emp.rank} />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={emp.photoUrl}
                        name={emp.name}
                        size="w-10 h-10"
                      />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {emp.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                    {emp.designation}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <span
                        className={`text-lg font-bold ${
                          emp.avgScore >= 4.5
                            ? "text-purple-600"
                            : emp.avgScore >= 4
                            ? "text-yellow-600"
                            : emp.avgScore >= 3
                            ? "text-gray-600"
                            : "text-orange-600"
                        }`}
                      >
                        {emp.avgScore.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-500">/5.0</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-full text-sm font-semibold">
                      {emp.reviewCount}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-center">
                      <Stars value={emp.avgScore} />
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {leaderboard.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No performance data available yet.
          </div>
        )}
      </div>
    </div>
  );
}
