import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../api/axios";
import { getDaysInMonth, startOfMonth } from "date-fns";
import { PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

// Background colors for fields based on tag
const STATUS_COLORS = {
  Working: "bg-green-200 text-black",
  "On Leave": "bg-blue-200 text-black",
  Holiday: "bg-yellow-200 text-black",
  Missed: "bg-red-200 text-black",
  Future: "bg-white text-gray-700",
  Sunday: "bg-orange-200 text-black",
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

  const keySequence = useRef([]);
  const SECRET_KEYS = ["ArrowLeft", "ArrowRight", "ArrowLeft", "k"];

  const fetchMonth = async () => {
    try {
      const { data } = await api.get(`/attendance/me?year=${year}&month=${month}`);
      const daysData = data.days.map(d => {
        const dayDate = new Date(d.date + "T00:00:00Z");
        const isPast = dayDate < today;
        const isFuture = dayDate > today;
        const isToday = dayDate.toDateString() === today.toDateString();
        const editable = isToday;

        let fullNote = d.note || "";
        let displayNote = fullNote.split(" ").slice(0, 15).join(" ");
        if (fullNote.split(" ").length > 15) displayNote += "...";

        let tag = d.tag;
        if (!d.entry && isPast) tag = "Missed";
        if (isFuture) tag = "Future";
        if (d.isSunday) tag = "Sunday";

        return {
          ...d,
          editable,
          fullNote,
          displayNote: displayNote || (isFuture ? "Coming Soon..." : ""),
          tag,
        };
      });
      setDays(daysData);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchMonth(); }, [year, month]);

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

  const handleSaveDay = async (day) => {
    try {
      await api.post("/attendance/me/entries", {
        entries: [{ date: day.date, tag: day.tag, note: day.fullNote }],
        forceEdit: forceEditMode,
      });
      setEditingDay(null);
      fetchMonth();
    } catch (err) { console.error(err); }
  };

  const handleResetDay = (date) => {
    setDays(prev =>
      prev.map(d => d.date === date ? { ...d, tag: "Working", fullNote: "", displayNote: "" } : d)
    );
    setEditingDay(null);
  };

  const handleDayChange = (date, field, value) => {
    setDays(prev =>
      prev.map(d => {
        if (d.date === date) {
          const updated = { ...d, [field]: value };
          if (field === "fullNote") {
            const truncated = value.split(" ").slice(0, 15).join(" ");
            updated.displayNote = value.split(" ").length > 15 ? truncated + "..." : truncated;
          }
          return updated;
        }
        return d;
      })
    );
  };

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

  return (
    <div className="p-6 font-sans">
      <h1 className="text-2xl font-bold mb-4">
        Employee Calendar {forceEditMode && "(Force Edit ON)"}
      </h1>

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
                    className={`border p-1 align-top min-w-[120px] h-[120px] relative transition-all duration-300 ${d ? STATUS_COLORS[d.tag] : "bg-gray-50 text-black"}`}
                    onMouseEnter={() => d && setHoveredDay(d.date)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {d && (
                      <>
                        <div className="flex justify-between items-center mb-1 px-1">
                          <span className="font-bold text-base">{d.day}</span>
                          <span className={`text-sm font-semibold px-1 py-0.5 rounded ${STATUS_COLORS[d.tag]}`}>
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
                          <div className="absolute top-1 right-1">
                            <PencilIcon
                              className="h-5 w-5 cursor-pointer text-gray-800"
                              onClick={() => setEditingDay(d.date)}
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
