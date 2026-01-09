import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import api from "../api/axios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, Star, Calendar, MessageSquare, User, Award } from "lucide-react";

// Read-only stars component
const Stars = ({ value }) => {
  const num = Number(value);
  const safeValue = Number.isFinite(num) ? Math.max(0, Math.min(5, num)) : 0;
  const fullStars = Math.floor(safeValue);
  const halfStar = safeValue - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="flex space-x-1">
      {Array(fullStars)
        .fill(0)
        .map((_, i) => (
          <span key={"f" + i} className="text-yellow-500 text-xl">★</span>
        ))}
      {halfStar && <span className="text-yellow-500 text-xl">☆</span>}
      {Array(emptyStars)
        .fill(0)
        .map((_, i) => (
          <span key={"e" + i} className="text-gray-300 text-xl">★</span>
        ))}
      <span className="ml-2 text-gray-600 dark:text-gray-400 font-semibold">
        {safeValue.toFixed(1)}/5
      </span>
    </div>
  );
};

const MyPerformancePage = () => {
  const { user } = useContext(AuthContext);
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMyPerformance();
  }, []);

  const fetchMyPerformance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/performance/me");
      const data = response.data?.data || response.data || [];
      setPerformances(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch performance:", err);
      setError(err.response?.data?.message || "Failed to load performance data");
      setPerformances([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (!performances || performances.length === 0) {
      return {
        average: 0,
        total: 0,
        latest: null,
        trend: "stable",
      };
    }

    const scores = performances
      .map((p) => Number(p.performanceScore) || 0)
      .filter((s) => s > 0);
    
    const average = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0;

    const latest = performances[0]; // Already sorted by createdAt desc

    // Calculate trend (compare last 2 records)
    let trend = "stable";
    if (performances.length >= 2) {
      const latestScore = Number(performances[0]?.performanceScore) || 0;
      const previousScore = Number(performances[1]?.performanceScore) || 0;
      if (latestScore > previousScore) trend = "up";
      else if (latestScore < previousScore) trend = "down";
    }

    return {
      average: Math.round(average * 100) / 100,
      total: performances.length,
      latest,
      trend,
    };
  }, [performances]);

  // Prepare chart data
  const chartData = React.useMemo(() => {
    if (!performances || performances.length === 0) return [];
    
    return [...performances]
      .reverse() // Reverse to show chronological order
      .map((p) => ({
        period: p.period || "N/A",
        score: Number(p.performanceScore) || 0,
        date: p.createdAt 
          ? new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
          : "N/A",
      }));
  }, [performances]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your performance data...</p>
        </div>
      </div>
    );
  }

  if (error && performances.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="text-red-500 text-6xl">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{error}</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {error.includes("candidate profile") 
              ? "Please contact HR to link your candidate profile to your account."
              : "Please try again later or contact support if the issue persists."}
          </p>
          <button
            onClick={fetchMyPerformance}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            My Performance
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your performance reviews and feedback over time
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Score</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.average.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">out of 5.0</p>
              </div>
              <div className="bg-indigo-100 dark:bg-indigo-900/20 p-3 rounded-full">
                <Award className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Reviews</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.total}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">performance records</p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full">
                <Calendar className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Performance Trend</p>
                <div className="flex items-center gap-2">
                  <TrendingUp
                    className={`h-6 w-6 ${
                      stats.trend === "up"
                        ? "text-green-600 dark:text-green-400"
                        : stats.trend === "down"
                        ? "text-red-600 dark:text-red-400 rotate-180"
                        : "text-gray-400"
                    }`}
                  />
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                    {stats.trend}
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {stats.trend === "up" && "Improving"}
                  {stats.trend === "down" && "Needs attention"}
                  {stats.trend === "stable" && "Consistent"}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Latest Performance Highlight */}
        {stats.latest && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm opacity-90 mb-2">Latest Performance Review</p>
                <h3 className="text-2xl font-bold mb-2">{stats.latest.period || "N/A"}</h3>
                <div className="mb-3">
                  <Stars value={stats.latest.performanceScore} />
                </div>
                {stats.latest.feedback && (
                  <p className="text-sm opacity-90 line-clamp-2">{stats.latest.feedback}</p>
                )}
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Star className="h-8 w-8" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Performance Chart */}
        {chartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Performance Over Time
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="period" 
                  stroke="#6b7280"
                  tick={{ fill: "#6b7280" }}
                />
                <YAxis 
                  domain={[0, 5]} 
                  stroke="#6b7280"
                  tick={{ fill: "#6b7280" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ fill: "#6366f1", r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Performance History */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Performance History
            </h2>
          </div>

          {performances.length === 0 ? (
            <div className="p-12 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No performance reviews available yet.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Your performance reviews will appear here once they are added by your manager.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {performances.map((performance, index) => (
                <motion.div
                  key={performance._id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-indigo-100 dark:bg-indigo-900/20 p-2 rounded-lg">
                          <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {performance.period || "N/A"}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {performance.createdAt
                              ? new Date(performance.createdAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              : "Date not available"}
                          </p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <Stars value={performance.performanceScore} />
                      </div>

                      {performance.feedback && (
                        <div className="mt-3">
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Feedback:
                              </p>
                              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                {performance.feedback}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {performance.reviewer && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <User className="h-4 w-4" />
                          <span>
                            Reviewed by:{" "}
                            {performance.reviewer.name ||
                              performance.reviewer.email ||
                              "Unknown"}
                          </span>
                        </div>
                      )}

                      {performance.nextReview && (
                        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          Next Review:{" "}
                          {new Date(performance.nextReview).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPerformancePage;
