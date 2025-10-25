import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../api/axios";
import { getDaysInMonth, startOfMonth } from "date-fns";
import { PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Background colors for fields based on tag
const STATUS_COLORS = {
  Working: "bg-green-200 text-black",
  "On Leave": "bg-blue-200 text-black",
  Holiday: "bg-yellow-200 text-black",
  Missed: "bg-red-200 text-black",
  Future: "bg-white text-gray-700",
  Sunday: "bg-orange-200 text-black",
  // fallback
  Default: "bg-white text-black",
};

// Colors for pie chart
const PIE_COLORS = {
  Working: "#68D391", // green
  "On Leave": "#63B3ED", // blue
  Missed: "#FC8181", // red
};

const STATUS_OPTIONS = ["Working", "On Leave"];

export default function EmployeeCalendarModern() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [days, setDays] = useState([]);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [editingDay, setEditingDay] = useState(null);
  const [forceEditMode, setForceEditMode] = useState(false);
  const [summary, setSummary] = useState({ total: 0, working: 0, missed: 0, leave: 0 });

  const keySequence = useRef([]);
  const SECRET_KEYS = ["ArrowLeft", "ArrowRight", "ArrowLeft", "k"];

  // FETCH month and use backend-provided tag/note (don't rely on d.entry)
  const fetchMonth = async () => {
    try {
      const { data } = await api.get(`/attendance/me?year=${year}&month=${month}`);
      console.log('[fetchMonth] api returned days count:', data.days?.length);

      const daysData = data.days.map(d => {
        const dayDate = new Date(d.date + "T00:00:00Z");
        const isFuture = dayDate > today;
        const editable = !d.isSunday && !d.isHoliday && (dayDate <= today || forceEditMode);

        const fullNote = d.note || "";
        let displayNote = fullNote.split(" ").slice(0, 15).join(" ");
        if (fullNote.split(" ").length > 15) displayNote += "...";

        // Trust backend tag. Backend already sets tag = 'Working'|'On Leave'|'Holiday'|'Missed' etc.
        let tag = d.tag || "Working";

        // Normalize special tags for display
        if (d.isSunday) tag = "Sunday";
        else if (isFuture) tag = "Future";

        // Friendly message overrides
        if (tag === "On Leave") {
          displayNote = fullNote || "You are on leave";
        } else if (tag === "Missed") {
          displayNote = fullNote || "No reporting";
        } else if (tag === "Holiday") {
          displayNote = fullNote || "Holiday";
        } else if (tag === "Future") {
          displayNote = "Coming Soon...";
        }

        return {
          ...d,
          editable,
          fullNote,
          displayNote,
          tag,
        };
      });

      setDays(daysData);

      // Summary: exclude Sundays & holidays & future
      const totalDays = daysData.filter(d => !d.isSunday && !d.isHoliday && d.tag !== "Future").length;
      const working = daysData.filter(d => d.tag === "Working").length;
      const missed = daysData.filter(d => d.tag === "Missed").length;
      const leave = daysData.filter(d => d.tag === "On Leave").length;
      setSummary({ total: totalDays, working, missed, leave });
    } catch (err) {
      console.error('[fetchMonth] error:', err);
    }
  };

  useEffect(() => { fetchMonth(); }, [year, month, forceEditMode]);

  const handleKeyDown = useCallback((e) => {
    keySequence.current.push(e.key);
    if (keySequence.current.length > SECRET_KEYS.length) keySequence.current.shift();
    if (SECRET_KEYS.every((k,i) => k === keySequence.current[i])) {
      setForceEditMode(prev => !prev);
      alert(`Force Edit Mode ${!forceEditMode ? 'Activated' : 'Deactivated'}`);
      keySequence.current = [];
    }
  }, [forceEditMode]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Prepare day for editing: ensure tag is one of editable options so select shows valid value
  const startEdit = (date) => {
    setDays(prev =>
      prev.map(d => {
        if (d.date === date) {
          const validTag = STATUS_OPTIONS.includes(d.tag) ? d.tag : "Working";
          return { ...d, tag: validTag };
        }
        return d;
      })
    );
    setEditingDay(date);
  };

  // Update day state when user edits tag or note
  const handleDayChange = (date, field, value) => {
    setDays(prev =>
      prev.map(d => {
        if (d.date === date) {
          const updated = { ...d, [field]: value };

          if (field === "fullNote") {
            const truncated = value.split(" ").slice(0, 15).join(" ");
            updated.displayNote = value.split(" ").length > 15 ? truncated + "..." : truncated;
          }
          if (field === "tag") {
            updated.tag = String(value).trim();
          }
          return updated;
        }
        return d;
      })
    );
  };

  // Save — uses freshest state, logs payload & server response, sends note as "note" key
  const handleSaveDay = async (day) => {
    try {
      const cur = days.find(d => d.date === day.date) || day;

      // Only allow these tags for user edits
      const allowedForUser = STATUS_OPTIONS;
      let sendTag = cur.tag ? String(cur.tag).trim() : null;
      if (!allowedForUser.includes(sendTag)) {
        console.warn('[frontend] tag not allowed for user edits, forcing "Working":', sendTag);
        sendTag = 'Working';
      }

      const payloadEntry = {
        date: cur.date,
        tag: sendTag,
        note: cur.fullNote || ""
      };

      console.log('[frontend] will send payloadEntry:', payloadEntry);

      if (!payloadEntry.date || !payloadEntry.tag) {
        console.warn('[frontend] missing date or tag - abort save', payloadEntry);
        return;
      }

      // optimistic update
      setDays(prev => prev.map(d => d.date === cur.date ? {
        ...d,
        tag: payloadEntry.tag,
        fullNote: payloadEntry.note,
        displayNote: (payloadEntry.note || "").split(" ").slice(0,15).join(" ")
      } : d));

      const res = await api.post("/attendance/me/entries", {
        entries: [payloadEntry],
        forceEdit: forceEditMode,
      });

      console.log('[frontend] server response:', res?.data);

      // If backend rejected, refetch authoritative data
      if (res?.data?.results && Array.isArray(res.data.results)) {
        const r = res.data.results[0];
        if (!r.ok) {
          console.error('[frontend] server rejected save for', r.date, r.message);
          await fetchMonth();
          return;
        }
      }

      setEditingDay(null);
      await fetchMonth();
    } catch (err) {
      console.error('[frontend] save error:', err);
      await fetchMonth();
    }
  };

  const handleResetDay = (date) => {
    setDays(prev =>
      prev.map(d => d.date === date ? { ...d, tag: "Working", fullNote: "", displayNote: "" } : d)
    );
    setEditingDay(null);
  };

  // Build weeks for calendar
  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const startDay = startOfMonth(new Date(year, month - 1)).getDay();
  const weeks = [];
  let dayCounter = 1;
  for (let i = 0; i < 6; i++) {
    const week = [];
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < startDay) week.push(null);
      else if (dayCounter > daysInMonth) week.push(null);
      else {
        const dayObj = days.find(d => d.day === dayCounter);
        week.push(dayObj);
        dayCounter++;
      }
    }
    weeks.push(week);
  }

  // Pie chart data
  const pieData = [
    { name: "Working", value: summary.working },
    { name: "On Leave", value: summary.leave },
    { name: "Missed", value: summary.missed },
  ];

  return (
    <div className="p-6 font-sans">
      <h1 className="text-2xl font-bold mb-4">
        Employee Calendar {forceEditMode && "(Force Edit ON)"}
      </h1>

      {/* Performance Summary */}
      <div className="mb-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="bg-gray-100 p-4 rounded shadow w-full md:w-1/2">
          <h2 className="text-lg font-semibold mb-2">Performance Summary</h2>
          <p>Total Working Days (excl. holidays & Sundays): {summary.total}</p>
          <p>Reported: {summary.working}</p>
          <p>On Leave: {summary.leave}</p>
          <p>Missed: {summary.missed}</p>
        </div>
        <div className="w-full md:w-1/2 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={60} label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex gap-4 mb-4 items-center">
        <input
          type="month"
          value={`${year}-${month.toString().padStart(2,"0")}`}
          onChange={e => {
            const [y,m] = e.target.value.split("-");
            setYear(Number(y));
            setMonth(Number(m));
          }}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="table-auto border-collapse border border-gray-300 w-full text-center">
          <thead>
            <tr>
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
                <th key={d} className="border p-2">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((w,i) => (
              <tr key={i}>
                {w.map((d, idx) => (
                  <td
                    key={idx}
                    className={`border p-1 align-top min-w-[120px] h-[120px] relative transition-all duration-300 ${d ? (STATUS_COLORS[d.tag] || STATUS_COLORS.Default) : "bg-gray-50 text-black"}`}
                    onMouseEnter={() => d && setHoveredDay(d.date)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {d && (
                      <>
                        <div className="flex justify-between items-center mb-1 px-1">
                          <span className="font-bold text-base">{d.day}</span>
                          <span className={`text-sm font-semibold px-1 py-0.5 rounded`}>
                            {d.tag}
                          </span>
                        </div>

                        <div
                          className="text-base mt-1 break-words"
                          style={{
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            WebkitLineClamp: hoveredDay === d.date || editingDay === d.date ? 10 : 3,
                          }}
                        >
                          {editingDay === d.date ? d.fullNote : d.displayNote}
                        </div>

                        {/* Pencil icon */}
                        {hoveredDay === d.date && d.editable && editingDay !== d.date && (
                          <div className="absolute bottom-1 right-1">
                            <PencilIcon
                              className="h-5 w-5 cursor-pointer text-gray-800"
                              onClick={() => startEdit(d.date)}
                            />
                          </div>
                        )}

                        {/* Inline edit */}
                        {editingDay === d.date && (
                          <div className="flex flex-col gap-1 mt-1 px-1">
                            <select
                              value={d.tag}
                              onChange={e => handleDayChange(d.date, "tag", e.target.value)}
                              className="px-1 py-1 text-sm rounded bg-gray-100 focus:outline-none"
                            >
                              {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <textarea
                              placeholder="Report here..."
                              value={d.fullNote}
                              onChange={e => handleDayChange(d.date, "fullNote", e.target.value)}
                              className="w-full px-1 py-1 text-sm rounded bg-gray-100 resize-none h-16 focus:outline-none"
                            />
                            <div className="flex gap-1 justify-end mt-1">
                              <button
                                className="bg-green-600 text-white px-2 py-1 rounded"
                                onClick={() => handleSaveDay(d)}
                              >
                                <CheckIcon className="h-4 w-4"/>
                              </button>
                              <button
                                className="bg-red-600 text-white px-2 py-1 rounded"
                                onClick={() => handleResetDay(d.date)}
                              >
                                <XMarkIcon className="h-4 w-4"/>
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
