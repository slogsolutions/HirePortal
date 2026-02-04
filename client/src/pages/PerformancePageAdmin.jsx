// AdminPerformancePage.jsx - NEW CYCLE-BASED SYSTEM
import React, { useEffect, useState } from "react";
import api from "../api/axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

// Performance tags with colors
const PERFORMANCE_TAGS = {
  'Outstanding': { color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-100' },
  'Very Good': { color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-100' },
  'Average': { color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-100' },
  'Below Average': { color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-100' },
  'Worst': { color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-100' }
};

// Star rating for forms
const StarRating = ({ value, setValue }) => (
  <div className="flex space-x-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <span
        key={i}
        className={`cursor-pointer text-3xl ${i <= (Number(value) || 0) ? "text-yellow-500" : "text-gray-300"}`}
        onClick={() => setValue(i)}
      >
        ★
      </span>
    ))}
  </div>
);

// Read-only stars
const Stars = ({ value }) => {
  const num = Number(value);
  const safeValue = Number.isFinite(num) ? Math.max(0, Math.min(5, num)) : 0;
  const fullStars = Math.floor(safeValue);
  const halfStar = safeValue - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="flex space-x-1 items-center">
      {Array(fullStars).fill(0).map((_, i) => (
        <span key={"f" + i} className="text-yellow-500">★</span>
      ))}
      {halfStar && <span className="text-yellow-500">☆</span>}
      {Array(emptyStars).fill(0).map((_, i) => (
        <span key={"e" + i} className="text-gray-300">★</span>
      ))}
      <span className="ml-2 text-sm text-gray-600">{safeValue.toFixed(1)}</span>
    </div>
  );
};

// Performance Tag Badge
const PerformanceTag = ({ tag, className = "" }) => {
  const tagInfo = PERFORMANCE_TAGS[tag] || PERFORMANCE_TAGS['Average'];
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${tagInfo.color} text-white ${className}`}>
      {tag}
    </span>
  );
};

// Warning Badge
const WarningBadge = ({ hasWarning, consecutiveCount = 0 }) => {
  if (!hasWarning) return null;
  
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold animate-pulse">
        🚨 Notice Period Warning
      </span>
      {consecutiveCount > 0 && (
        <span className="text-xs text-red-600">
          ({consecutiveCount} consecutive low months)
        </span>
      )}
    </div>
  );
};

// Financial Display
const FinancialDisplay = ({ incentives, penalties, net, className = "" }) => {
  return (
    <div className={`flex gap-4 text-sm ${className}`}>
      {incentives > 0 && (
        <span className="text-green-600 font-semibold">
          +₹{incentives.toLocaleString()}
        </span>
      )}
      {penalties > 0 && (
        <span className="text-red-600 font-semibold">
          -₹{penalties.toLocaleString()}
        </span>
      )}
      <span className={`font-bold ${net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
        Net: ₹{net.toLocaleString()}
      </span>
    </div>
  );
};

const AdminPerformancePage = () => {
  const [performances, setPerformances] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedPerformance, setSelectedPerformance] = useState(null);
  const [formData, setFormData] = useState({
    employee: "",
    reviewForMonth: null,
    performanceScore: 3,
    feedback: "",
    incentiveOverride: "",
    penaltyOverride: "",
    overrideReason: "",
  });
  const [isEdit, setIsEdit] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState(null);

  // Fetch candidates
  const fetchCandidates = async () => {
    try {
      const { data } = await api.get("/candidates");
      setCandidates(Array.isArray(data) ? data : (data?.candidates || []));
    } catch (err) {
      console.error("fetchCandidates error:", err);
      setCandidates([]);
    }
  };

  // Fetch cycles
  const fetchCycles = async () => {
    try {
      const { data } = await api.get("/performance/cycles");
      setCycles(data?.data || []);
      
      // Set active cycle as default
      const activeCycle = (data?.data || []).find(c => c.status === 'active');
      if (activeCycle && !selectedCycle) {
        setSelectedCycle(activeCycle._id);
      }
    } catch (err) {
      console.error("fetchCycles error:", err);
    }
  };

  // Fetch performances by cycle
  const fetchPerformances = async (cycleId) => {
    try {
      const url = cycleId ? `/performance?cycleId=${cycleId}` : '/performance';
      const { data } = await api.get(url);
      setPerformances(data?.data || []);
    } catch (err) {
      console.error("fetchPerformances error:", err);
      setPerformances([]);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchCycles();
  }, []);

  useEffect(() => {
    if (selectedCycle) {
      fetchPerformances(selectedCycle);
    }
  }, [selectedCycle]);

  // Form handling
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (performance) => {
    if (!performance || !performance.employee) {
      alert("Cannot edit: invalid performance record.");
      return;
    }
    setFormData({
      employee: performance.employee._id || performance.employee.id || "",
      reviewForMonth: performance.reviewForMonth ? new Date(performance.reviewForMonth) : null,
      performanceScore: typeof performance.performanceScore === "number" ? performance.performanceScore : 3,
      feedback: performance.feedback || "",
      incentiveOverride: performance.incentiveOverride || "",
      penaltyOverride: performance.penaltyOverride || "",
      overrideReason: performance.overrideReason || "",
    });
    setSelectedPerformance(performance);
    setIsEdit(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this performance review?")) return;
    try {
      await api.delete(`/performance/${id}`);
      await fetchPerformances(selectedCycle);
      setSelectedPerformance(null);
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("Failed to delete performance review");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.employee) return alert("Select a candidate");
    if (!formData.reviewForMonth) return alert("Select which month you are reviewing");
    if (!formData.feedback.trim()) return alert("Feedback is required");
    
    try {
      const submitData = {
        reviewForMonth: formData.reviewForMonth.toISOString(),
        performanceScore: formData.performanceScore,
        feedback: formData.feedback.trim(),
      };
      
      // Add overrides if provided
      if (formData.incentiveOverride) {
        submitData.incentiveOverride = parseFloat(formData.incentiveOverride);
      }
      if (formData.penaltyOverride) {
        submitData.penaltyOverride = parseFloat(formData.penaltyOverride);
      }
      if (formData.overrideReason) {
        submitData.overrideReason = formData.overrideReason.trim();
      }

      if (isEdit && selectedPerformance) {
        await api.put(`/performance/${selectedPerformance._id}`, submitData);
      } else {
        const response = await api.post(`/performance/${formData.employee}`, submitData);
        
        // Show warning if notice period triggered
        if (response.data.warning) {
          alert(response.data.message);
        }
      }

      // Reset form
      setFormData({ 
        employee: "", 
        reviewForMonth: null,
        performanceScore: 3, 
        feedback: "",
        incentiveOverride: "",
        penaltyOverride: "",
        overrideReason: ""
      });
      setSelectedPerformance(null);
      setIsEdit(false);
      setShowModal(false);
      
      await fetchPerformances(selectedCycle);
    } catch (err) {
      console.error("handleSubmit error:", err);
      const errorMsg = err.response?.data?.message || "Failed to save performance";
      alert(errorMsg);
    }
  };

  // Group performances by employee
  const grouped = performances.reduce((acc, curr) => {
    if (!curr || !curr.employee) return acc;
    const id = curr.employee._id || curr.employee.id || "unknown";
    const name = `${curr.employee.firstName || ""} ${curr.employee.lastName || ""}`.trim() || "Unknown employee";
    
    if (!acc[id]) {
      acc[id] = { 
        employeeName: name, 
        records: [], 
        scores: [],
        totalIncentives: 0,
        totalPenalties: 0,
        hasWarnings: false
      };
    }
    
    acc[id].records.push(curr);
    const score = typeof curr.performanceScore === "number" ? curr.performanceScore : (Number(curr.performanceScore) || 0);
    acc[id].scores.push(score);
    acc[id].totalIncentives += curr.incentiveAmount || 0;
    acc[id].totalPenalties += curr.penaltyAmount || 0;
    acc[id].netAmount = acc[id].totalIncentives - acc[id].totalPenalties;
    acc[id].average = acc[id].scores.length ? (acc[id].scores.reduce((a, b) => a + b, 0) / acc[id].scores.length) : 0;
    
    return acc;
  }, {});

  const filteredEmployees = Object.keys(grouped).filter((id) => {
    const name = (grouped[id]?.employeeName || "").toLowerCase();
    return name.includes((search || "").toLowerCase());
  });

  // Get current cycle info
  const currentCycle = cycles.find(c => c._id === selectedCycle);
  
  // Calculate cycle statistics
  const cycleStats = {
    totalReviews: performances.length,
    totalIncentives: performances.reduce((sum, p) => sum + (p.incentiveAmount || 0), 0),
    totalPenalties: performances.reduce((sum, p) => sum + (p.penaltyAmount || 0), 0),
    uniqueEmployees: new Set(performances.map(p => p.employee?._id || p.employee)).size,
  };
  cycleStats.netAmount = cycleStats.totalIncentives - cycleStats.totalPenalties;

  return (
    <div className="p-6 bg-gray-50 min-h-screen dark:bg-slate-900">
      <h1 className="text-3xl font-bold mb-6 text-indigo-600 dark:text-gray-100">
        Performance Management System
      </h1>

      {/* Current Cycle Info */}
      {currentCycle && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-800 dark:text-blue-300">
                Cycle {currentCycle.cycleNumber}: {format(new Date(currentCycle.startDate), 'MMM yyyy')} - {format(new Date(currentCycle.endDate), 'MMM yyyy')}
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Status: {currentCycle.status === 'active' ? '🟢 Active' : '🔴 Closed'}
              </p>
            </div>
            {currentCycle.status === 'active' && (
              <button
                onClick={async () => {
                  if (window.confirm('Are you sure you want to close this cycle? This will freeze all summaries.')) {
                    try {
                      await api.post(`/performance/cycles/${currentCycle._id}/close`);
                      alert('Cycle closed successfully!');
                      fetchCycles();
                    } catch (err) {
                      alert('Failed to close cycle: ' + (err.response?.data?.message || err.message));
                    }
                  }
                }}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition text-sm"
              >
                Close Cycle
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cycle Statistics */}
      {currentCycle && performances.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Reviews</div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {cycleStats.totalReviews}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {cycleStats.uniqueEmployees} employees
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Incentives</div>
            <div className="text-2xl font-bold text-green-600">
              ₹{cycleStats.totalIncentives.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Paid to employees
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Penalties</div>
            <div className="text-2xl font-bold text-red-600">
              ₹{cycleStats.totalPenalties.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Collected from all employees
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Net Amount</div>
            <div className={`text-2xl font-bold ${cycleStats.netAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              ₹{cycleStats.netAmount.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {cycleStats.netAmount >= 0 ? 'Incentives > Penalties' : 'Penalties > Incentives'}
            </div>
          </div>
        </div>
      )}

      {/* Performance Analytics Graphs */}
      {currentCycle && performances.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Performance Trend Over Time */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Performance Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={performances.slice(0, 20).reverse().map((p, idx) => ({
                name: p.employee?.firstName ? `${p.employee.firstName.substring(0, 8)}...` : `Emp ${idx + 1}`,
                score: p.performanceScore || 0,
                date: p.reviewDate ? format(new Date(p.reviewDate), 'MMM dd') : `Review ${idx + 1}`
              }))}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" className="text-xs" stroke="currentColor" />
                <YAxis domain={[0, 5]} className="text-xs" stroke="currentColor" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "rgba(0,0,0,0.8)", 
                    border: "none",
                    borderRadius: "8px",
                    color: "white"
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  dot={{ fill: "#6366f1", r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Performance Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Incentives vs Penalties */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Incentives vs Penalties</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performances.slice(0, 15).map((p, idx) => ({
                name: p.employee?.firstName ? `${p.employee.firstName.substring(0, 8)}...` : `Emp ${idx + 1}`,
                incentive: p.incentiveAmount || 0,
                penalty: p.penaltyAmount || 0
              }))}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" className="text-xs" stroke="currentColor" />
                <YAxis className="text-xs" stroke="currentColor" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "rgba(0,0,0,0.8)", 
                    border: "none",
                    borderRadius: "8px",
                    color: "white"
                  }}
                  formatter={(value) => `₹${value.toLocaleString()}`}
                />
                <Legend />
                <Bar dataKey="incentive" fill="#10b981" name="Incentive" />
                <Bar dataKey="penalty" fill="#ef4444" name="Penalty" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Distribution */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Performance Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: '5★ Outstanding', value: performances.filter(p => p.performanceScore === 5).length, color: '#10b981' },
                    { name: '4★ Very Good', value: performances.filter(p => p.performanceScore === 4).length, color: '#3b82f6' },
                    { name: '3★ Average', value: performances.filter(p => p.performanceScore === 3).length, color: '#eab308' },
                    { name: '2★ Below Avg', value: performances.filter(p => p.performanceScore === 2).length, color: '#f97316' },
                    { name: '1★ Worst', value: performances.filter(p => p.performanceScore === 1).length, color: '#ef4444' }
                  ].filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: '5★ Outstanding', value: performances.filter(p => p.performanceScore === 5).length, color: '#10b981' },
                    { name: '4★ Very Good', value: performances.filter(p => p.performanceScore === 4).length, color: '#3b82f6' },
                    { name: '3★ Average', value: performances.filter(p => p.performanceScore === 3).length, color: '#eab308' },
                    { name: '2★ Below Avg', value: performances.filter(p => p.performanceScore === 2).length, color: '#f97316' },
                    { name: '1★ Worst', value: performances.filter(p => p.performanceScore === 1).length, color: '#ef4444' }
                  ].filter(d => d.value > 0).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "rgba(0,0,0,0.8)", 
                    border: "none",
                    borderRadius: "8px",
                    color: "white"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Financial Overview */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4 dark:text-white">Financial Overview</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                {
                  name: 'Cycle Totals',
                  Incentives: cycleStats.totalIncentives,
                  Penalties: cycleStats.totalPenalties,
                  Net: cycleStats.netAmount
                }
              ]}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" className="text-xs" stroke="currentColor" />
                <YAxis className="text-xs" stroke="currentColor" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "rgba(0,0,0,0.8)", 
                    border: "none",
                    borderRadius: "8px",
                    color: "white"
                  }}
                  formatter={(value) => `₹${value.toLocaleString()}`}
                />
                <Legend />
                <Bar dataKey="Incentives" fill="#10b981" />
                <Bar dataKey="Penalties" fill="#ef4444" />
                <Bar dataKey="Net" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-wrap gap-4 mb-6 items-end">
        {/* Cycle Selector */}
        <div className="flex-1 min-w-[250px]">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Performance Cycle
          </label>
          <select
            value={selectedCycle || ''}
            onChange={(e) => setSelectedCycle(e.target.value)}
            className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:text-gray-100"
          >
            <option value="">All Cycles</option>
            {cycles.map((cycle) => (
              <option key={cycle._id} value={cycle._id}>
                Cycle {cycle.cycleNumber}: {format(new Date(cycle.startDate), 'MMM yyyy')} - {format(new Date(cycle.endDate), 'MMM yyyy')}
                {cycle.status === 'active' ? ' (Active)' : ' (Closed)'}
              </option>
            ))}
          </select>
        </div>
        
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Search Employee
          </label>
          <input
            type="text"
            placeholder="Search by name..."
            className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-800 dark:text-gray-100"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {/* Add Button */}
        <button
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition font-semibold"
          onClick={() => { 
            setShowModal(true); 
            setIsEdit(false);
            setFormData({
              employee: "",
              reviewForMonth: null,
              performanceScore: 3,
              feedback: "",
              incentiveOverride: "",
              penaltyOverride: "",
              overrideReason: "",
            });
          }}
        >
          + Add Review
        </button>
      </div>

      {/* Employee Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.length === 0 && (
          <p className="text-gray-500 col-span-full text-center py-12">
            {search ? "No employees found matching your search." : "No performance reviews yet. Click 'Add Review' to get started."}
          </p>
        )}
        
        {filteredEmployees.map((id) => {
          const emp = grouped[id] || { employeeName: "Unknown", records: [], average: 0, netAmount: 0 };
          return (
            <motion.div
              key={id}
              className="bg-white dark:bg-slate-800 shadow rounded-lg p-4 hover:shadow-lg transition cursor-pointer"
              whileHover={{ scale: 1.02 }}
              onClick={() => setExpandedEmployee(id)}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-bold dark:text-gray-100">{emp.employeeName}</h3>
                {emp.hasWarnings && <span className="text-red-500 text-xl">⚠️</span>}
              </div>
              
              <Stars value={emp.average} />
              
              <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
                {emp.records.length} review{emp.records.length !== 1 ? 's' : ''}
              </p>
              
              <FinancialDisplay 
                incentives={emp.totalIncentives}
                penalties={emp.totalPenalties}
                net={emp.netAmount}
                className="mt-3"
              />
              
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Click to view details →
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Expanded Employee Details */}
      {expandedEmployee && grouped[expandedEmployee] && (
        <motion.div
          className="fixed top-0 right-0 h-full w-full md:w-1/2 bg-white dark:bg-slate-800 shadow-2xl p-6 z-50 overflow-y-auto"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
        >
          <button
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-3xl font-bold"
            onClick={() => setExpandedEmployee(null)}
          >
            ×
          </button>

          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4 dark:text-white">{grouped[expandedEmployee].employeeName}</h2>
            
            {/* Cycle Summary */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-4 rounded-lg mb-6">
              <h3 className="font-semibold text-lg mb-3 dark:text-white">Cycle Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Total Reviews:</span>
                  <span className="font-bold ml-2 dark:text-white">{grouped[expandedEmployee].records.length}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Average Score:</span>
                  <span className="font-bold ml-2 dark:text-white">{grouped[expandedEmployee].average?.toFixed(1)}/5</span>
                </div>
                <div className="col-span-2">
                  <FinancialDisplay 
                    incentives={grouped[expandedEmployee].totalIncentives || 0}
                    penalties={grouped[expandedEmployee].totalPenalties || 0}
                    net={grouped[expandedEmployee].netAmount || 0}
                  />
                </div>
              </div>
            </div>

            {/* Individual Reviews */}
            <h3 className="font-semibold text-lg mb-3 dark:text-white">Review History</h3>
            <div className="space-y-4">
              {grouped[expandedEmployee].records
                .sort((a, b) => new Date(b.reviewDate) - new Date(a.reviewDate))
                .map((review, idx) => (
                <div key={idx} className="border dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Review for: {review.reviewForMonth ? format(new Date(review.reviewForMonth), 'MMMM yyyy') : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Given on: {review.reviewDate ? format(new Date(review.reviewDate), 'MMM dd, yyyy') : 'N/A'}
                      </div>
                    </div>
                    <div className="text-right">
                      <Stars value={review.performanceScore || 0} />
                      <PerformanceTag tag={review.performanceTag || 'Average'} className="mt-1" />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-slate-700 p-3 rounded mb-3">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Feedback:</div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">{review.feedback || 'N/A'}</div>
                  </div>
                  
                  <FinancialDisplay 
                    incentives={review.incentiveAmount || 0}
                    penalties={review.penaltyAmount || 0}
                    net={(review.incentiveAmount || 0) - (review.penaltyAmount || 0)}
                    className="mb-2"
                  />
                  
                  {review.overrideReason && (
                    <div className="text-xs text-blue-600 dark:text-blue-400 mb-2 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      <strong>Override reason:</strong> {review.overrideReason}
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-3">
                    <button
                      className="bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500 text-white text-sm font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(review);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 text-white text-sm font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(review._id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 flex justify-center items-center z-50 bg-black/50 backdrop-blur-sm">
          <motion.div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
              {isEdit ? "Edit Performance Review" : "Add Performance Review"}
            </h2>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Employee Select */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Employee *
                </label>
                <select
                  name="employee"
                  value={formData.employee}
                  onChange={handleChange}
                  className="border border-gray-300 dark:border-slate-600 p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:text-white"
                  disabled={isEdit}
                  required
                >
                  <option value="">Select Candidate</option>
                  {candidates.map((c) => (
                    <option key={c._id} value={c._id}>
                      {`${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unnamed"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Review For Month - THE KEY CHANGE */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Which month are you reviewing? *
                </label>
                <DatePicker
                  selected={formData.reviewForMonth}
                  onChange={(date) => setFormData(prev => ({ ...prev, reviewForMonth: date }))}
                  dateFormat="MMMM yyyy"
                  showMonthYearPicker
                  placeholderText="Select month (e.g., January 2025)"
                  className="border border-gray-300 dark:border-slate-600 p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:text-white"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  💡 Select the month you are evaluating (not when you're giving the review)
                </p>
              </div>

              {/* Performance Score */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Performance Score *
                </label>
                <StarRating
                  value={formData.performanceScore}
                  setValue={(val) => setFormData(prev => ({ ...prev, performanceScore: val }))}
                />
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 space-y-1 bg-gray-50 dark:bg-slate-700 p-3 rounded">
                  <div className="font-semibold mb-1">Default Financial Rules:</div>
                  <div>5★ = ₹1,000 incentive | 4★ = ₹500 incentive</div>
                  <div>3★ = No change | 2★ = ₹10 penalty | 1★ = ₹50  penalty</div>
                  <div className="text-blue-600 dark:text-blue-400 mt-1">You can override these below</div>
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Feedback *
                </label>
                <textarea
                  name="feedback"
                  placeholder="Provide detailed feedback about the employee's performance..."
                  value={formData.feedback}
                  onChange={handleChange}
                  className="border border-gray-300 dark:border-slate-600 p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:text-white"
                  rows={4}
                  required
                />
              </div>

              {/* Optional Overrides */}
              <div className="border-t dark:border-slate-600 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Override Financial Amounts (Optional)
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Incentive Override (₹)
                    </label>
                    <input
                      type="number"
                      name="incentiveOverride"
                      value={formData.incentiveOverride}
                      onChange={handleChange}
                      placeholder="Leave empty for default"
                      className="border border-gray-300 dark:border-slate-600 p-2 rounded-lg w-full dark:bg-slate-700 dark:text-white"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Penalty Override (₹)
                    </label>
                    <input
                      type="number"
                      name="penaltyOverride"
                      value={formData.penaltyOverride}
                      onChange={handleChange}
                      placeholder="Leave empty for default"
                      className="border border-gray-300 dark:border-slate-600 p-2 rounded-lg w-full dark:bg-slate-700 dark:text-white"
                      min="0"
                    />
                  </div>
                </div>
                
                {(formData.incentiveOverride || formData.penaltyOverride) && (
                  <div className="mt-3">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Reason for Override *
                    </label>
                    <input
                      type="text"
                      name="overrideReason"
                      value={formData.overrideReason}
                      onChange={handleChange}
                      placeholder="Why are you overriding the default amount?"
                      className="border border-gray-300 dark:border-slate-600 p-2 rounded-lg w-full dark:bg-slate-700 dark:text-white"
                      required={!!(formData.incentiveOverride || formData.penaltyOverride)}
                    />
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t dark:border-slate-600">
                <button 
                  type="button" 
                  className="bg-gray-200 dark:bg-slate-600 px-6 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-500 dark:text-white font-semibold" 
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  {isEdit ? "Update Review" : "Save Review"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminPerformancePage;
