import React, { useEffect, useState, useCallback, useRef } from "react";
import api from "../api/axios";
import { getDaysInMonth, startOfMonth } from "date-fns";
import { PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const STATUS_COLORS = {
  Working: "bg-green-200 text-slate-900",
  "On Leave": "bg-blue-200 text-slate-900",
  Holiday: "bg-yellow-200 text-slate-900",
  Missed: "bg-red-200 text-slate-900",
  Future: "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400",
  Sunday: "bg-orange-200 text-slate-900",
  Default: "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
};

const PIE_COLORS = {
  Working: "#68D391",
  "On Leave": "#63B3ED",
  Missed: "#FC8181",
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
  const [summary, setSummary] = useState({
    total: 0,
    working: 0,
    missed: 0,
    leave: 0,
  });

const keySequence = useRef([]);
const SECRET_KEYS_2 = ["l", "a", "k", "s", "h"];

const handleKeyDown = useCallback(
  (e) => {
    keySequence.current.push(e.key.toLowerCase());

    if (keySequence.current.length > SECRET_KEYS_2.length)
      keySequence.current.shift();

    const matched = SECRET_KEYS_2.every(
      (k, i) => k === keySequence.current[i]
    );

    if (matched) {
      setForceEditMode((prev) => !prev);
      alert(
        `Force Edit Mode ${!forceEditMode ? "Activated" : "Deactivated"}`
      );
      keySequence.current = [];
    }
  },
  [forceEditMode]
);



  const fetchMonth = async () => {
    try {
      const { data } = await api.get(
        `/attendance/me?year=${year}&month=${month}`
      );
      const daysData = data.days.map((d) => {
        const dayDate = new Date(d.date + "T00:00:00Z");
        const isFuture = dayDate > today;
        // const editable = !d.isSunday && !d.isHoliday && (dayDate <= today || forceEditMode);
        const isToday = dayDate.toDateString() === today.toDateString();
        const editable =
          !d.isSunday && !d.isHoliday && (isToday || forceEditMode);

        const fullNote = d.note || "";
        const displayNote =
          fullNote.split(" ").slice(0, 15).join(" ") +
          (fullNote.split(" ").length > 15 ? "..." : "");
        let tag = d.tag || "Working";
        if (d.isSunday) tag = "Sunday";
        else if (isFuture) tag = "Future";
        return { ...d, editable, fullNote, displayNote, tag };
      });
      setDays(daysData);

      const totalDays = daysData.filter(
        (d) => !d.isSunday && !d.isHoliday && d.tag !== "Future"
      ).length;
      const working = daysData.filter((d) => d.tag === "Working").length;
      const missed = daysData.filter((d) => d.tag === "Missed").length;
      const leave = daysData.filter((d) => d.tag === "On Leave").length;
      setSummary({ total: totalDays, working, missed, leave });
    } catch (err) {
      console.error("[fetchMonth] error:", err);
    }
  };

  useEffect(() => {
    fetchMonth();
  }, [year, month, forceEditMode]);

  // const handleKeyDown = useCallback(
  //   (e) => {
  //     keySequence.current.push(e.key);
  //     if (keySequence.current.length > SECRET_KEYS.length)
  //       keySequence.current.shift();
  //     if (SECRET_KEYS.every((k, i) => k === keySequence.current[i])) {
  //       setForceEditMode((prev) => !prev);
  //       alert(
  //         `Force Edit Mode ${!forceEditMode ? "Activated" : "Deactivated"}`
  //       );
  //       keySequence.current = [];
  //     }
  //   },
  //   [forceEditMode]
  // );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const startEdit = (date) => setEditingDay(date);

  const handleDayChange = (date, field, value) => {
    setDays((prev) =>
      prev.map((d) =>
        d.date === date
          ? {
              ...d,
              [field]: value,
              displayNote:
                field === "fullNote"
                  ? value.split(" ").slice(0, 15).join(" ") +
                    (value.split(" ").length > 15 ? "..." : "")
                  : d.displayNote,
            }
          : d
      )
    );
  };

  const handleSaveDay = async (day) => {
    try {
      const cur = days.find((d) => d.date === day.date) || day;
      let sendTag = STATUS_OPTIONS.includes(cur.tag) ? cur.tag : "Working";
      const payloadEntry = {
        date: cur.date,
        tag: sendTag,
        note: cur.fullNote || "",
      };
      setDays((prev) =>
        prev.map((d) =>
          d.date === cur.date
            ? { ...d, tag: sendTag, fullNote: payloadEntry.note }
            : d
        )
      );
      await api.post("/attendance/me/entries", {
        entries: [payloadEntry],
        forceEdit: forceEditMode,
      });
      setEditingDay(null);
      await fetchMonth();
    } catch (err) {
      console.error(err);
      await fetchMonth();
    }
  };

  const handleResetDay = (date) => {
    setDays((prev) =>
      prev.map((d) =>
        d.date === date
          ? { ...d, tag: "Working", fullNote: "", displayNote: "" }
          : d
      )
    );
    setEditingDay(null);
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
        const dayObj = days.find((d) => d.day === dayCounter);
        week.push(dayObj);
        dayCounter++;
      }
    }
    weeks.push(week);
  }

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
        <div className="bg-gray-100 dark:bg-slate-900 p-4 rounded shadow w-full md:w-1/2">
          <h2 className="text-lg font-semibold mb-2">Performance Summary</h2>
          <p>Total Working Days (excl. holidays & Sundays): {summary.total}</p>
          <p>Reported: {summary.working}</p>
          <p>On Leave: {summary.leave}</p>
          <p>Missed: {summary.missed}</p>
        </div>
        <div className="w-full md:w-1/2 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                outerRadius={60}
                label
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={PIE_COLORS[entry.name]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Month Selector */}
      <div className="flex gap-4 mb-4 items-center">
        <input
          type="month"
          value={`${year}-${month.toString().padStart(2, "0")}`}
          onChange={(e) => {
            const [y, m] = e.target.value.split("-");
            setYear(Number(y));
            setMonth(Number(m));
          }}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weeks.flat().map((d, idx) => (
          <div
            key={idx}
            className={`relative rounded-lg min-h-[100px] p-2 flex flex-col items-start justify-start ${
              d
                ? STATUS_COLORS[d.tag] || STATUS_COLORS.Default
                : "bg-gray-50 dark:bg-slate-800"
            }`}
            onMouseEnter={() => d && setHoveredDay(d.date)}
            onMouseLeave={() => setHoveredDay(null)}
          >
            {d && (
              <>
                <div className="w-full flex justify-center pointer-events-none">
                  <span className="font-bold text-base">{d.day}</span>
                </div>

                {/* Show full content on hover or if editing */}
                {(hoveredDay === d.date || editingDay === d.date) && (
                  <div className="w-full bg-white dark:bg-slate-900 rounded-lg p-2 mt-1 border dark:border-slate-700 shadow flex flex-col break-words whitespace-pre-wrap">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-bold">{d.day}</div>
                      <div className="text-xs font-medium">{d.tag}</div>
                    </div>
                    <div className="flex-1 text-sm break-words whitespace-pre-wrap mb-2">
                      {editingDay === d.date ? (
                        <textarea
                          value={d.fullNote}
                          onChange={(e) =>
                            handleDayChange(d.date, "fullNote", e.target.value)
                          }
                          className="w-full p-1 border rounded break-words whitespace-pre-wrap"
                          rows={4}
                        />
                      ) : (
                        <div>{d.fullNote || "No notes"}</div>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      {editingDay === d.date ? (
                        <>
                          <select
                            value={d.tag}
                            onChange={(e) =>
                              handleDayChange(d.date, "tag", e.target.value)
                            }
                            className="px-2 py-1 rounded border text-sm"
                          >
                            {STATUS_OPTIONS.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                          <button
                            className="px-2 py-1 bg-green-600 text-white rounded"
                            onClick={() => handleSaveDay(d)}
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            className="px-2 py-1 bg-red-600 text-white rounded"
                            onClick={() => handleResetDay(d.date)}
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        d.editable && (
                          <PencilIcon
                            className="h-5 w-5 cursor-pointer text-slate-900 dark:text-slate-100"
                            onClick={() => startEdit(d.date)}
                          />
                        )
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
