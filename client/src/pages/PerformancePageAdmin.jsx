// // AdminPerformancePage.jsx
// import React, { useEffect, useState } from "react";
// import api from "../api/axios";
// import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";
// import {
//   ResponsiveContainer,
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   Tooltip,
//   CartesianGrid,
// } from "recharts";
// import { motion } from "framer-motion";

// // Star rating for forms
// const StarRating = ({ value, setValue }) => (
//   <div className="flex space-x-1">
//     {[1, 2, 3, 4, 5].map((i) => (
//       <span
//         key={i}
//         className={`cursor-pointer text-2xl ${i <= value ? "text-yellow-500" : "text-gray-300"}`}
//         onClick={() => setValue(i)}
//       >
//         ★
//       </span>
//     ))}
//   </div>
// );

// // Read-only stars with half-star support
// const Stars = ({ value }) => {
//   const fullStars = Math.floor(value);
//   const halfStar = value - fullStars >= 0.5;
//   const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

//   return (
//     <div className="flex space-x-1">
//       {Array(fullStars)
//         .fill(0)
//         .map((_, i) => (
//           <span key={"f" + i} className="text-yellow-500">★</span>
//         ))}
//       {halfStar && <span className="text-yellow-500">☆</span>}
//       {Array(emptyStars)
//         .fill(0)
//         .map((_, i) => (
//           <span key={"e" + i} className="text-gray-300">★</span>
//         ))}
//     </div>
//   );
// };

// // Employee Line Chart
// const EmployeeLineChart = ({ records, color }) => {
//   const chartData = [...records].sort((a, b) => new Date(a.period) - new Date(b.period));
//   const formattedData = chartData.map((r) => ({
//     period: r.period,
//     score: r.performanceScore,
//   }));

//   return (
//     <ResponsiveContainer width="100%" height={250}>
//       <LineChart data={formattedData}>
//         <CartesianGrid strokeDasharray="3 3" />
//         <XAxis dataKey="period" />
//         <YAxis domain={[0, 5]} />
//         <Tooltip />
//         <Line type="monotone" dataKey="score" stroke={color || "#4f46e5"} strokeWidth={3} />
//       </LineChart>
//     </ResponsiveContainer>
//   );
// };

// // Overall Line Chart (all employees)
// const OverallLineChart = ({ grouped }) => {
//   const colors = ["#4f46e5", "#16a34a", "#eab308", "#dc2626", "#db2777", "#0ea5e9"];
//   const allPeriodsSet = new Set();
//   Object.values(grouped).forEach((g) => g.records.forEach((r) => allPeriodsSet.add(r.period)));
//   const allPeriods = Array.from(allPeriodsSet).sort((a, b) => new Date(a) - new Date(b));

//   const chartData = allPeriods.map((period) => {
//     const obj = { period };
//     Object.keys(grouped).forEach((id) => {
//       const record = grouped[id].records.find((r) => r.period === period);
//       obj[id] = record ? record.performanceScore : null;
//     });
//     return obj;
//   });

//   const lines = Object.keys(grouped).map((id, index) => (
//     <Line
//       key={id}
//       type="monotone"
//       dataKey={id}
//       stroke={colors[index % colors.length]}
//       strokeWidth={2}
//       connectNulls
//       name={grouped[id].employeeName}
//     />
//   ));

//   return (
//     <ResponsiveContainer width="100%" height={300}>
//       <LineChart data={chartData}>
//         <CartesianGrid strokeDasharray="3 3" />
//         <XAxis dataKey="period" />
//         <YAxis domain={[0, 5]} />
//         <Tooltip />
//         {lines}
//       </LineChart>
//     </ResponsiveContainer>
//   );
// };

// const AdminPerformancePage = () => {
//   const [performances, setPerformances] = useState([]);
//   const [candidates, setCandidates] = useState([]);
//   const [search, setSearch] = useState("");
//   const [showModal, setShowModal] = useState(false);
//   const [selectedPerformance, setSelectedPerformance] = useState(null);
//   const [formData, setFormData] = useState({
//     employee: "",
//     period: "",
//     performanceScore: 3,
//     feedback: "",
//     nextReview: null,
//   });
//   const [isEdit, setIsEdit] = useState(false);
//   const [expandedEmployee, setExpandedEmployee] = useState(null);

//   // Fetch data
//   const fetchCandidates = async () => {
//     try {
//       const { data } = await api.get("/candidates");
//       setCandidates(data);
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const fetchPerformances = async () => {
//     try {
//       const { data } = await api.get("/performance");
//       setPerformances(data);
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   useEffect(() => {
//     fetchCandidates();
//     fetchPerformances();
//   }, []);

//   // Form handling
//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };
//   const handleDateChange = (date) => setFormData((prev) => ({ ...prev, nextReview: date }));

//   const handleEdit = (performance) => {
//     setFormData({
//       employee: performance.employee._id,
//       period: performance.period,
//       performanceScore: performance.performanceScore,
//       feedback: performance.feedback,
//       nextReview: performance.nextReview ? new Date(performance.nextReview) : null,
//     });
//     setSelectedPerformance(performance);
//     setIsEdit(true);
//     setShowModal(true);
//   };

//   const handleDelete = async (id) => {
//     if (!window.confirm("Are you sure you want to delete this performance?")) return;
//     try {
//       await api.delete(`/performance/${id}`);
//       fetchPerformances();
//       setSelectedPerformance(null);
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!formData.employee) return alert("Select a candidate");
//     try {
//       const stored = JSON.parse(localStorage.getItem("auth:v1"));
//       const reviewerId = stored?.user?._id || stored?.user?.id;

//       if (isEdit && selectedPerformance) {
//         await api.put(`/performance/${selectedPerformance._id}`, {
//           ...formData,
//           reviewer: reviewerId,
//         });
//       } else {
//         await api.post(`/performance/${formData.employee}`, {
//           ...formData,
//           reviewer: reviewerId,
//         });
//       }

//       setFormData({ employee: "", period: "", performanceScore: 3, feedback: "", nextReview: null });
//       setSelectedPerformance(null);
//       setIsEdit(false);
//       setShowModal(false);
//       fetchPerformances();
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   // Group by employee
//   const grouped = performances.reduce((acc, curr) => {
//     const id = curr.employee._id;
//     if (!acc[id]) {
//       acc[id] = { employeeName: `${curr.employee.firstName} ${curr.employee.lastName}`, records: [], scores: [] };
//     }
//     acc[id].records.push(curr);
//     acc[id].scores.push(curr.performanceScore);
//     acc[id].average = acc[id].scores.reduce((a, b) => a + b, 0) / acc[id].scores.length;
//     return acc;
//   }, {});

//   const filteredEmployees = Object.keys(grouped).filter((id) =>
//     grouped[id].employeeName.toLowerCase().includes(search.toLowerCase())
//   );

//   return (
//     <div className="p-6 bg-gray-50 min-h-screen">
//       <h1 className="text-3xl font-bold mb-6 text-indigo-600">
//         Employee Performance Dashboard
//       </h1>

//       {/* Filters */}
//       <div className="flex flex-wrap gap-4 mb-6 items-center">
//         <input
//           type="text"
//           placeholder="Search employee..."
//           className="border p-2 rounded-lg flex-1 focus:ring-2 focus:ring-indigo-500 outline-none"
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//         />
//         <button
//           className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
//           onClick={() => { setShowModal(true); setIsEdit(false); }}
//         >
//           Add Performance
//         </button>
//       </div>

//       {/* Overall Line Chart */}
//       {Object.keys(grouped).length > 0 && (
//         <div className="bg-white p-4 rounded-lg shadow mb-6">
//           <h2 className="text-xl font-semibold mb-2">Overall Employee Performance</h2>
//           <OverallLineChart grouped={grouped} />
//         </div>
//       )}

//       {/* Employee Cards */}
//       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
//         {filteredEmployees.length === 0 && (
//           <p className="text-gray-500 col-span-full">No employees found.</p>
//         )}
//         {filteredEmployees.map((id) => {
//           const emp = grouped[id];
//           return (
//             <motion.div
//               key={id}
//               className="bg-white shadow rounded-lg p-4 hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
//               whileHover={{ scale: 1.02 }}
//               onClick={() => setExpandedEmployee(id)}
//             >
//               <div>
//                 <h3 className="text-lg font-bold">{emp.employeeName}</h3>
//                 <Stars value={emp.average} />
//                 <p className="text-gray-500 mt-1">{emp.records.length} records</p>
//               </div>
//               <EmployeeLineChart records={emp.records} />
//             </motion.div>
//           );
//         })}
//       </div>
// {/* Expanded Employee Details */}
// {expandedEmployee && (
//   <motion.div
//     className="fixed top-[64px] right-0 h-[calc(100%-64px)] w-full md:w-1/3 bg-white shadow-lg p-6 z-40 overflow-y-auto"
//     initial={{ x: "100%" }}
//     animate={{ x: 0 }}
//     exit={{ x: "100%" }}
//   >
//     {/* Close Button */}
//     <button
//       className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
//       onClick={() => setExpandedEmployee(null)}
//     >
//       ×
//     </button>

//     {grouped[expandedEmployee].records.map((p, idx) => (
//       <div key={idx} className="border-b py-4 flex flex-col gap-2 mt-8">
//         <p><strong>Period:</strong> {p.period}</p>
//         <p>
//           <strong>Performance Score:</strong> <Stars value={p.performanceScore} />
//         </p>
//         <p><strong>Feedback:</strong> {p.feedback}</p>
//         <p>
//           <strong>Next Review:</strong>{" "}
//           {p.nextReview
//             ? new Date(p.nextReview).toLocaleString("en-GB", {
//                 dateStyle: "short",
//                 timeStyle: "short",
//               })
//             : "N/A"}
//         </p>
//         <p>
//           <strong>Created At:</strong>{" "}
//           {new Date(p.createdAt).toLocaleString("en-GB", {
//             dateStyle: "short",
//             timeStyle: "short",
//           })}
//         </p>
//         <p>
//           <strong>Updated At:</strong>{" "}
//           {new Date(p.updatedAt).toLocaleString("en-GB", {
//             dateStyle: "short",
//             timeStyle: "short",
//           })}
//         </p>

//         <div className="flex gap-2 mt-2">
//           <button
//             className="bg-yellow-400 px-2 py-1 rounded hover:bg-yellow-500 text-white"
//             onClick={() => handleEdit(p)}
//           >
//             Edit
//           </button>
//           <button
//             className="bg-red-500 px-2 py-1 rounded hover:bg-red-600 text-white"
//             onClick={() => handleDelete(p._id)}
//           >
//             Delete
//           </button>
//         </div>
//       </div>
//     ))}
//   </motion.div>
// )}



//       {/* Add/Edit Modal */}
//       {showModal && (
//         <div className="fixed inset-0 flex justify-center items-center z-50 bg-white/20 backdrop-blur-md">
//           <motion.div
//             className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-md"
//             initial={{ scale: 0.9, opacity: 0 }}
//             animate={{ scale: 1, opacity: 1 }}
//           >
//             <h2 className="text-2xl font-bold mb-4 text-gray-800">
//               {isEdit ? "Edit Performance" : "Add Performance"}
//             </h2>
//             <form className="space-y-4" onSubmit={handleSubmit}>
//               <select
//                 name="employee"
//                 value={formData.employee}
//                 onChange={handleChange}
//                 className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none"
//                 disabled={isEdit}
//               >
//                 <option value="">Select Candidate</option>
//                 {candidates.map((c) => (
//                   <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>
//                 ))}
//               </select>

//               <input
//                 type="text"
//                 name="period"
//                 placeholder="Period (e.g., Dec 2025)"
//                 value={formData.period}
//                 onChange={handleChange}
//                 className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none"
//               />

//               <StarRating
//                 value={formData.performanceScore}
//                 setValue={(val) => setFormData(prev => ({ ...prev, performanceScore: val }))}
//               />

//               <textarea
//                 name="feedback"
//                 placeholder="Feedback"
//                 value={formData.feedback}
//                 onChange={handleChange}
//                 className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none"
//               />

//               <DatePicker
//                 selected={formData.nextReview}
//                 onChange={handleDateChange}
//                 placeholderText="Next Review Date"
//                 className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none"
//               />

//               <div className="flex justify-end gap-3 mt-4">
//                 <button type="button" className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300" onClick={() => setShowModal(false)}>Cancel</button>
//                 <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">{isEdit ? "Update" : "Save"}</button>
//               </div>
//             </form>
//           </motion.div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default AdminPerformancePage;










// AdminPerformancePage.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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
  LabelList,
} from "recharts";
import { motion } from "framer-motion";

// Star rating for forms
const StarRating = ({ value, setValue }) => (
  <div className="flex space-x-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <span
        key={i}
        className={`cursor-pointer text-2xl ${i <= value ? "text-yellow-500" : "text-gray-300"}`}
        onClick={() => setValue(i)}
      >
        ★
      </span>
    ))}
  </div>
);

// Read-only stars with half-star support
const Stars = ({ value }) => {
  const fullStars = Math.floor(value);
  const halfStar = value - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="flex space-x-1">
      {Array(fullStars)
        .fill(0)
        .map((_, i) => (
          <span key={"f" + i} className="text-yellow-500">★</span>
        ))}
      {halfStar && <span className="text-yellow-500">☆</span>}
      {Array(emptyStars)
        .fill(0)
        .map((_, i) => (
          <span key={"e" + i} className="text-gray-300">★</span>
        ))}
    </div>
  );
};

// Employee Line Chart
const EmployeeLineChart = ({ records, color }) => {
  const chartData = [...records].sort((a, b) => new Date(a.period) - new Date(b.period));
  const formattedData = chartData.map((r) => ({
    period: r.period,
    score: r.performanceScore,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis domain={[0, 5]} />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke={color || "#4f46e5"} strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  );
};

// Modern Overall Bar Chart (avg score per employee)
const OverallBarChart = ({ grouped, onBarClick }) => {
  // prepare sorted data (descending by average)
  const data = Object.keys(grouped).map((id) => ({
    id,
    name: grouped[id].employeeName,
    average: Math.round((grouped[id].average + Number.EPSILON) * 100) / 100, // 2 decimals
    records: grouped[id].records.length,
    latestComment:
      grouped[id].records
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.feedback || "",
  }));

  data.sort((a, b) => b.average - a.average);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-md border border-gray-100 text-sm w-64">
        <div className="font-semibold text-gray-800 truncate">{d.name}</div>
        <div className="text-gray-600 mt-1">Average: <span className="font-bold">{d.average}/5</span></div>
        <div className="text-gray-600">Records: {d.records}</div>
        {d.latestComment ? <div className="mt-2 text-gray-700 truncate">{d.latestComment}</div> : null}
      </div>
    );
  };

  const labelFormatter = (val) => `${val}/5`;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={340}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 20, left: 0, bottom: 60 }}
        >
          <defs>
            <linearGradient id="gradA" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95}/>
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.95}/>
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tickLine={false}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={60}
            tick={{ fontSize: 12 }}
          />
          <YAxis domain={[0, 5]} tickCount={6} tickFormatter={(v) => `${v}`} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />

          <Bar
            dataKey="average"
            fill="url(#gradA)"
            radius={[8, 8, 8, 8]}
            barSize={32}
            animationDuration={800}
            onClick={(e) => onBarClick && onBarClick(e.id)}
          >
            <LabelList dataKey="average" position="top" formatter={labelFormatter} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-3 flex items-center gap-3 text-sm text-gray-600">
        <span className="inline-flex items-center gap-2">
          <span className="w-3 h-3 rounded-sm" style={{ background: "linear-gradient(90deg,#6366f1,#06b6d4)" }} />
          Average score (0–5)
        </span>
        <span className="text-xs text-gray-400">• Click a bar to open employee details</span>
      </div>
    </div>
  );
};

const AdminPerformancePage = () => {
  const [performances, setPerformances] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedPerformance, setSelectedPerformance] = useState(null);
  const [formData, setFormData] = useState({
    employee: "",
    period: "",
    performanceScore: 3,
    feedback: "",
    nextReview: null,
  });
  const [isEdit, setIsEdit] = useState(false);
  const [expandedEmployee, setExpandedEmployee] = useState(null);

  // Fetch data
  const fetchCandidates = async () => {
    try {
      const { data } = await api.get("/candidates");
      setCandidates(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPerformances = async () => {
    try {
      const { data } = await api.get("/performance");
      setPerformances(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchPerformances();
  }, []);

  // Form handling
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleDateChange = (date) => setFormData((prev) => ({ ...prev, nextReview: date }));

  const handleEdit = (performance) => {
    setFormData({
      employee: performance.employee._id,
      period: performance.period,
      performanceScore: performance.performanceScore,
      feedback: performance.feedback,
      nextReview: performance.nextReview ? new Date(performance.nextReview) : null,
    });
    setSelectedPerformance(performance);
    setIsEdit(true);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this performance?")) return;
    try {
      await api.delete(`/performance/${id}`);
      fetchPerformances();
      setSelectedPerformance(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee) return alert("Select a candidate");
    try {
      const stored = JSON.parse(localStorage.getItem("auth:v1"));
      const reviewerId = stored?.user?._id || stored?.user?.id;

      if (isEdit && selectedPerformance) {
        await api.put(`/performance/${selectedPerformance._id}`, {
          ...formData,
          reviewer: reviewerId,
        });
      } else {
        await api.post(`/performance/${formData.employee}`, {
          ...formData,
          reviewer: reviewerId,
        });
      }

      setFormData({ employee: "", period: "", performanceScore: 3, feedback: "", nextReview: null });
      setSelectedPerformance(null);
      setIsEdit(false);
      setShowModal(false);
      fetchPerformances();
    } catch (err) {
      console.error(err);
    }
  };

  // Group by employee
  const grouped = performances.reduce((acc, curr) => {
    const id = curr.employee._id;
    if (!acc[id]) {
      acc[id] = { employeeName: `${curr.employee.firstName} ${curr.employee.lastName}`, records: [], scores: [] };
    }
    acc[id].records.push(curr);
    acc[id].scores.push(curr.performanceScore);
    acc[id].average = acc[id].scores.reduce((a, b) => a + b, 0) / acc[id].scores.length;
    return acc;
  }, {});

  const filteredEmployees = Object.keys(grouped).filter((id) =>
    grouped[id].employeeName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-indigo-600">
        Employee Performance Dashboard
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6 items-center">
        <input
          type="text"
          placeholder="Search employee..."
          className="border p-2 rounded-lg flex-1 focus:ring-2 focus:ring-indigo-500 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          onClick={() => { setShowModal(true); setIsEdit(false); }}
        >
          Add Performance
        </button>
      </div>

      {/* Modern Overall Bar Chart */}
      {Object.keys(grouped).length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Overall Employee Performance</h2>
            <div className="text-sm text-gray-500">Average score per employee</div>
          </div>

          <OverallBarChart
            grouped={grouped}
            onBarClick={(employeeId) => {
              setExpandedEmployee(employeeId);
            }}
          />
        </div>
      )}

      {/* Employee Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEmployees.length === 0 && (
          <p className="text-gray-500 col-span-full">No employees found.</p>
        )}
        {filteredEmployees.map((id) => {
          const emp = grouped[id];
          return (
            <motion.div
              key={id}
              className="bg-white shadow rounded-lg p-4 hover:shadow-lg transition cursor-pointer flex flex-col justify-between"
              whileHover={{ scale: 1.02 }}
              onClick={() => setExpandedEmployee(id)}
            >
              <div>
                <h3 className="text-lg font-bold">{emp.employeeName}</h3>
                <Stars value={emp.average} />
                <p className="text-gray-500 mt-1">{emp.records.length} records</p>
              </div>
              <EmployeeLineChart records={emp.records} />
            </motion.div>
          );
        })}
      </div>

      {/* Expanded Employee Details */}
      {expandedEmployee && (
        <motion.div
          className="fixed top-[64px] right-0 h-[calc(100%-64px)] w-full md:w-1/3 bg-white shadow-lg p-6 z-40 overflow-y-auto"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
        >
          {/* Close Button */}
          <button
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
            onClick={() => setExpandedEmployee(null)}
          >
            ×
          </button>

          {grouped[expandedEmployee].records.map((p, idx) => (
            <div key={idx} className="border-b py-4 flex flex-col gap-2 mt-8">
              <p><strong>Period:</strong> {p.period}</p>
              <p>
                <strong>Performance Score:</strong> <Stars value={p.performanceScore} />
              </p>
              <p><strong>Feedback:</strong> {p.feedback}</p>
              <p>
                <strong>Next Review:</strong>{" "}
                {p.nextReview
                  ? new Date(p.nextReview).toLocaleString("en-GB", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "N/A"}
              </p>
              <p>
                <strong>Created At:</strong>{" "}
                {new Date(p.createdAt).toLocaleString("en-GB", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
              <p>
                <strong>Updated At:</strong>{" "}
                {new Date(p.updatedAt).toLocaleString("en-GB", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>

              <div className="flex gap-2 mt-2">
                <button
                  className="bg-yellow-400 px-2 py-1 rounded hover:bg-yellow-500 text-white"
                  onClick={() => handleEdit(p)}
                >
                  Edit
                </button>
                <button
                  className="bg-red-500 px-2 py-1 rounded hover:bg-red-600 text-white"
                  onClick={() => handleDelete(p._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 flex justify-center items-center z-50 bg-white/20 backdrop-blur-md">
          <motion.div
            className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-md"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              {isEdit ? "Edit Performance" : "Add Performance"}
            </h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <select
                name="employee"
                value={formData.employee}
                onChange={handleChange}
                className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none"
                disabled={isEdit}
              >
                <option value="">Select Candidate</option>
                {candidates.map((c) => (
                  <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>

              <input
                type="text"
                name="period"
                placeholder="Period (e.g., Dec 2025)"
                value={formData.period}
                onChange={handleChange}
                className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none"
              />

              <StarRating
                value={formData.performanceScore}
                setValue={(val) => setFormData(prev => ({ ...prev, performanceScore: val }))}
              />

              <textarea
                name="feedback"
                placeholder="Feedback"
                value={formData.feedback}
                onChange={handleChange}
                className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none"
              />

              <DatePicker
                selected={formData.nextReview}
                onChange={handleDateChange}
                placeholderText="Next Review Date"
                className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none"
              />

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">{isEdit ? "Update" : "Save"}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminPerformancePage;
