// src/admin/AdminUsersWithDetail.jsx
import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { getDaysInMonth, startOfMonth } from 'date-fns';
import { PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

/* (top comment kept) */

// Color mapping for small badges (tailwind classes)
const STATUS_COLORS = {
  Working: "bg-green-200 text-black",
  "On Leave": "bg-blue-200 text-black",
  Holiday: "bg-yellow-200 text-black",
  Missed: "bg-red-200 text-black",
  Future: "bg-white text-gray-700",
  Sunday: "bg-orange-200 text-black",
  Pending: "bg-gray-100 text-black", // <-- new: today's not-yet-reported marker
  Default: "bg-white text-black",
};

// Status dropdown options
const STATUS_OPTIONS = ["Working","On Leave","Holiday","Missed","Absent"];

// Chart colors
const COLORS = {
  working: "#48BB78", // green
  onleave: "#4299E1", // blue
  missed: "#F56565",  // red
  holiday: "#F6E05E"
};

const pad = (n) => String(n).padStart(2, '0');

export default function AdminUsersWithDetail() {
  const today = new Date();

  // Users/report state
  const [users, setUsers] = useState([]);
  const [report, setReport] = useState([]); // aggregated counts from server
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Selected user & calendar state
  const [selectedUser, setSelectedUser] = useState(null);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [days, setDays] = useState([]);
  const [editingDay, setEditingDay] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Per-user summary derived for chart and left panel
  const [allUsersSummary, setAllUsersSummary] = useState([]);
  const [stackedChartData, setStackedChartData] = useState([]);

  // Todays reporting state (new)
  const [todaysReport, setTodaysReport] = useState([]); // [{ userId, name, email, role, today: { date, day, tag, note, isSunday, isHoliday } }]
  const [loadingToday, setLoadingToday] = useState(false);

  // small map for quick lookup
  const summaryMap = {};
  allUsersSummary.forEach(s => { summaryMap[s.userId] = s; });

  // Fetch users & aggregated report for selected month
  const fetchUsersAndReport = async (y = year, m = month) => {
    setLoadingUsers(true);
    try {
      // fetch users
      const uRes = await api.get('/attendance/admin/users');
      const usersData = uRes.data?.data || uRes.data || [];
      setUsers(usersData);

      // compute start/end ISO for the month (UTC)
      const daysInMonth = getDaysInMonth(new Date(y, m - 1));
      const start = `${y}-${pad(m)}-01`;
      const end = `${y}-${pad(m)}-${pad(daysInMonth)}`;

      // fetch aggregated report limited to this month
      const rRes = await api.get('/attendance/admin/report', { params: { start, end } });
      const agg = rRes.data?.data || rRes.data || [];

      setReport(agg);

      // Build quick map from aggregation: userId -> tagCounts
      const reportMap = {};
      agg.forEach(item => {
        reportMap[item.userId] = item.tagCounts || {};
      });

      // Build per-user summary (counts and percentages)
      const summaries = usersData.map(u => {
        const tagCounts = reportMap[u._id] || {};
        const workingCount = Number(tagCounts.Working || 0) + Number(tagCounts.Holiday || 0); // holiday as working
        const onLeaveCount = Number(tagCounts['On Leave'] || 0);
        const reported = workingCount + onLeaveCount; // days with entry counted as reported
        const missedCount = Math.max(0, daysInMonth - reported); // days with no entry => missed
        const pctWorking = daysInMonth > 0 ? (workingCount / daysInMonth) * 100 : 0;
        const pctOnLeave = daysInMonth > 0 ? (onLeaveCount / daysInMonth) * 100 : 0;
        const pctMissed = daysInMonth > 0 ? (missedCount / daysInMonth) * 100 : 0;

        return {
          userId: u._id,
          name: u.name || u.email,
          email: u.email,
          role: u.role,
          Working: workingCount,
          OnLeave: onLeaveCount,
          Missed: missedCount,
          totalDays: daysInMonth,
          pctWorking: Number(pctWorking.toFixed(2)),
          pctOnLeave: Number(pctOnLeave.toFixed(2)),
          pctMissed: Number(pctMissed.toFixed(2))
        };
      });

      setAllUsersSummary(summaries);

      // Build stacked chart data (each bar fills to 100% via percentage values)
      const chartData = summaries.map(s => ({
        name: s.name,
        WorkingPct: s.pctWorking,
        OnLeavePct: s.pctOnLeave,
        MissedPct: s.pctMissed,
        WorkingCount: s.Working,
        OnLeaveCount: s.OnLeave,
        MissedCount: s.Missed,
        totalDays: s.totalDays
      }));
      setStackedChartData(chartData);

    } catch (err) {
      console.error('[admin] fetch users/report error', err);
      setUsers([]);
      setReport([]);
      setAllUsersSummary([]);
      setStackedChartData([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsersAndReport();
  }, [year, month]);

  // Build a quick reportMap for left-hand display if needed
  const reportMap = {};
  (report || []).forEach(r => { reportMap[r.userId] = r.tagCounts || {}; });

  // Fetch month for selected user (adminGetUserMonth)
  const fetchUserMonth = async (userId, y = year, m = month) => {
    if (!userId) return;
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/attendance/admin/user/${userId}`, { params: { year: y, month: m } });
      const daysData = (data?.days || []).map(d => {
        const fullNote = d.note || '';
        let displayNote = fullNote.split(' ').slice(0, 15).join(' ');
        if (fullNote.split(' ').length > 15) displayNote += '...';
        let tag = d.tag || 'Working';
        if (d.isSunday) tag = 'Sunday';
        const isFuture = new Date(d.date + 'T00:00:00Z') > new Date();
        if (isFuture) tag = 'Future';
        if (tag === 'On Leave') displayNote = fullNote || 'You are on leave';
        if (tag === 'Missed') displayNote = fullNote || 'No reporting';
        if (tag === 'Holiday') displayNote = fullNote || 'Holiday';
        if (tag === 'Future') displayNote = 'Coming Soon...';
        return { ...d, fullNote, displayNote, tag };
      });
      setDays(daysData);

      // derive per-user summary from daysData and enforce missed recalculation
      const daysInMonth = getDaysInMonth(new Date(y, m - 1));
      const totalWorking = daysData.reduce((acc, d) => acc + ((d.tag === 'Working' || d.tag === 'Holiday') ? 1 : 0), 0);
      const totalLeave = daysData.reduce((acc, d) => acc + (d.tag === 'On Leave' ? 1 : 0), 0);
      const totalHoliday = daysData.reduce((acc, d) => acc + (d.tag === 'Holiday' ? 1 : 0), 0);
      const reported = totalWorking + totalLeave;
      const recalculatedMissed = Math.max(0, daysInMonth - reported);
      const perf = daysInMonth > 0 ? (((totalWorking + totalHoliday) / daysInMonth) * 100).toFixed(2) : "0.00";

      setUserSummary({
        total: daysInMonth,
        working: totalWorking + totalHoliday,
        leave: totalLeave,
        holiday: totalHoliday,
        missed: recalculatedMissed,
        performance: Number(perf)
      });

    } catch (err) {
      console.error('[admin] fetchUserMonth error', err);
      setDays([]);
      setUserSummary({});
    } finally {
      setLoadingDetail(false);
    }
  };

  // local userSummary for right panel (separate state)
  const [userSummary, setUserSummary] = useState({});

  useEffect(() => {
    if (selectedUser) fetchUserMonth(selectedUser._id, year, month);
    else {
      setDays([]);
      setUserSummary({});
      // When we deselect user, auto-fetch today's reporting for everyone
      fetchTodaysReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, year, month]);

  // NEW: fetch today's reporting for all users (calls backend '/attendance/admin/today-report')
  const fetchTodaysReport = async () => {
    setLoadingToday(true);
    try {
      const res = await api.get('/attendance/admin/today-report');
      // expected res.data.data or res.data (array)
      const data = res.data?.data || res.data || [];
      console.log(data,"data for today from backend")
      // Normalize a bit for frontend: create displayNote and tag mapping similar to user month
      const normalized = data.map(u => {
        const t = u.today || {};
        const fullNote = t.note || '';
        const displayNote = fullNote.split(' ').slice(0, 15).join(' ') + (fullNote.split(' ').length > 15 ? '...' : '');
        let tag = t.tag || 'Pending';
        if (t.isSunday) tag = 'Sunday';
        if (t.isHoliday) tag = 'Holiday';
        return {
          userId: u._id,
          name: u.name || u.email,
          email: u.email,
          role: u.role,
          today: { ...t, fullNote, displayNote, tag }
        };
      });
      setTodaysReport(normalized);
    } catch (err) {
      console.error('[admin] fetchTodaysReport error', err);
      setTodaysReport([]);
    } finally {
      setLoadingToday(false);
    }
  };

  // Edit helpers (same as before)
  const startEdit = (date) => {
    setDays(prev => prev.map(d => d.date === date ? { ...d, tag: STATUS_OPTIONS.includes(d.tag) ? d.tag : "Working" } : d));
    setEditingDay(date);
  };

  const handleDayChange = (date, field, value) => {
    setDays(prev => prev.map(d => {
      if (d.date === date) {
        const updated = { ...d, [field]: value };
        if (field === 'fullNote') {
          const truncated = value.split(' ').slice(0, 15).join(' ');
          updated.displayNote = value.split(' ').length > 15 ? truncated + '...' : truncated;
        }
        if (field === 'tag') updated.tag = String(value).trim();
        return updated;
      }
      return d;
    }));
  };

  const saveDay = async (d) => {
    if (!selectedUser) return;
    try {
      const payload = {
        userId: selectedUser._id,
        entries: [{ date: d.date, tag: d.tag, note: d.fullNote || '' }],
        forceEdit: true
      };
      await api.post('/attendance/admin/entries', payload);
      setEditingDay(null);
      await fetchUserMonth(selectedUser._id, year, month);
      fetchUsersAndReport(year, month);
    } catch (err) {
      console.error('[admin] saveDay error', err);
      await fetchUserMonth(selectedUser._id, year, month);
      fetchUsersAndReport(year, month);
    }
  };

  const cancelEdit = () => setEditingDay(null);

  // Calendar helper (same as before)
  const buildWeeks = (y, m) => {
    const daysInMonth = getDaysInMonth(new Date(y, m - 1));
    const startDay = startOfMonth(new Date(y, m - 1)).getDay();
    const weeks = [];
    let dayCounter = 1;
    for (let i = 0; i < 6; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < startDay) week.push(null);
        else if (dayCounter > daysInMonth) week.push(null);
        else {
          const dayObj = days.find(dd => dd.day === dayCounter) || {
            day: dayCounter,
            date: new Date(y, m - 1, dayCounter).toISOString().slice(0, 10),
            tag: 'Working',
            fullNote: '',
            displayNote: ''
          };
          week.push(dayObj);
          dayCounter++;
        }
      }
      weeks.push(week);
    }
    return weeks;
  };

  const weeks = buildWeeks(year, month);

  // Custom tooltip for stacked percent chart: show counts + percents
  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    // payload contains series entries; we also have corresponding *_Count in payload[0].payload
    const p = payload[0].payload;
    return (
      <div className="bg-white p-2 rounded border text-sm shadow">
        <div className="font-semibold mb-1">{p.name}</div>
        <div>Working: {p.WorkingCount} ({p.WorkingPct}%)</div>
        <div>On Leave: {p.OnLeaveCount} ({p.OnLeavePct}%)</div>
        <div>Missed: {p.MissedCount} ({p.MissedPct}%)</div>
        <div className="text-xs text-gray-500 mt-1">Total days: {p.totalDays}</div>
      </div>
    );
  };

  // Build chart data with both pct and count fields
  const pctChartData = stackedChartData.map(d => ({
    name: d.name,
    WorkingPct: d.WorkingPct,
    OnLeavePct: d.OnLeavePct,
    MissedPct: d.MissedPct,
    WorkingCount: d.WorkingCount,
    OnLeaveCount: d.OnLeaveCount,
    MissedCount: d.MissedCount,
    totalDays: d.totalDays
  }));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-2">Admin — Users & Detail</h1>
      <div className="mb-2 text-sm text-gray-600">Note: Holidays count as <strong>Working</strong> days in the report.</div>

      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm text-gray-600">Report month:</label>
        <input
          type="month"
          value={`${year}-${String(month).padStart(2, '0')}`}
          onChange={e => {
            const [y,m] = e.target.value.split('-');
            setYear(Number(y)); setMonth(Number(m));
          }}
          className="border rounded px-2 py-1 text-sm"
        />
        <button className="px-3 py-1 bg-indigo-600 text-white rounded" onClick={() => fetchUsersAndReport(year, month)}>Refresh Report</button>

        {/* NEW: button to show today's reporting and deselect any user */}
        <button
          className="px-3 py-1 bg-gray-200 text-black rounded ml-2"
          onClick={() => { setSelectedUser(null); fetchTodaysReport(); }}
        >
          Show today's reporting
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: users list (unchanged) */}
        <div className="lg:w-1/3 space-y-4">
          <div className="p-3 bg-white rounded shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Users</h2>
              <button className="text-sm text-indigo-600" onClick={() => fetchUsersAndReport(year, month)}>Refresh</button>
            </div>
            {loadingUsers ? (
              <div className="text-sm text-gray-500 mt-2">Loading users...</div>
            ) : (
              <div className="mt-3 space-y-3 max-h-[60vh] overflow-auto">
                {users.map(u => {
                  const s = summaryMap[u._id] || allUsersSummary.find(x => x.userId === u._id) || {};
                  const working = s.Working ?? 0;
                  const leave = s.OnLeave ?? 0;
                  const missed = s.Missed ?? 0;
                  return (
                    <div
                      key={u._id}
                      className={`p-3 rounded border cursor-pointer ${selectedUser?._id === u._id ? 'bg-indigo-50 border-indigo-200' : 'bg-white'}`}
                      onClick={() => setSelectedUser(u)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{u.name || u.email}</div>
                          <div className="text-xs text-gray-600">{u.email}</div>
                          <div className="text-xs text-gray-500">role: {u.role}</div>
                        </div>
                        <div className="text-right text-xs">
                          <div>W: <span className="font-semibold">{working}</span></div>
                          <div>L: <span className="font-semibold">{leave}</span></div>
                          <div>M: <span className="font-semibold">{missed}</span></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stacked percentage bar chart (all employees) (unchanged) */}
          <div className="p-3 bg-white rounded shadow-sm">
            <h3 className="text-sm font-semibold mb-2">All Employees — {year}-{pad(month)}</h3>
            <div className="w-full h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pctChartData} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid stroke="#eee" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis unit="%" domain={[0,100]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  {/* stacked percentage bars; order from bottom to top */}
                  <Bar dataKey="WorkingPct" stackId="a" fill={COLORS.working} />
                  <Bar dataKey="OnLeavePct" stackId="a" fill={COLORS.onleave} />
                  <Bar dataKey="MissedPct" stackId="a" fill={COLORS.missed} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-xs text-gray-500">Bars show percentages of the month per employee (Working / On Leave / Missed).</div>
          </div>
        </div>

        {/* Right: Detail area */}
        <div className="lg:w-2/3 bg-white rounded shadow-sm p-4">
          {/* NEW: when no user is selected show today's reporting for all users */}
          {!selectedUser ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-lg font-semibold">Today's reporting — { (new Date()).toISOString().slice(0,10) }</div>
                  <div className="text-sm text-gray-600">Overview of everyone's reporting for today</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1 bg-gray-100 rounded text-sm"
                    onClick={() => { fetchTodaysReport(); }}
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {loadingToday ? (
                <div className="text-sm text-gray-500">Loading today's reporting...</div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-auto">
                  {todaysReport.length === 0 ? (
                    <div className="text-center text-gray-600">No data for today.</div>
                  ) : todaysReport.map(u => {
                    const t = u.today || {};
                    const cellClass = STATUS_COLORS[t.tag] || STATUS_COLORS.Default;
                    return (
                      <div key={u.userId} className="p-3 rounded border bg-white flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{u.name}</div>
                          <div className="text-xs text-gray-600">{u.email} • {u.role}</div>
                          <div className="text-sm mt-2">{t.displayNote || t.note || (t.tag === 'Pending' ? 'No report yet' : '')}</div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold px-3 py-1 rounded ${cellClass}`}>{t.tag}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* existing selectedUser UI - unchanged */
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-lg font-semibold">{selectedUser.name || selectedUser.email}</div>
                  <div className="text-sm text-gray-600">{selectedUser.email} • {selectedUser.role}</div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="month"
                    value={`${year}-${String(month).padStart(2,'0')}`}
                    onChange={e=>{ const [y,m]=e.target.value.split('-'); setYear(Number(y)); setMonth(Number(m)); }}
                    className="border rounded px-2 py-1 text-sm"
                  />
                  <button className="text-sm text-gray-600" onClick={() => fetchUserMonth(selectedUser._id, year, month)}>Refresh</button>
                </div>
              </div>
              {/* ... rest of selectedUser UI (unchanged) */}
              {/* Headline + user quick stats */}
              <div className="mb-4 p-3 rounded bg-gradient-to-r from-green-50 to-blue-50 border">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Selected Employee report for this month</div>
                    <div className="text-xl font-semibold">{selectedUser.name || selectedUser.email} • {year}-{pad(month)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Total days</div>
                    <div className="text-2xl font-bold">{userSummary.total ?? getDaysInMonth(new Date(year, month-1))}</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="p-3 rounded bg-white shadow-sm text-center">
                    <div className="text-sm text-gray-500">Working</div>
                    <div className="text-xl font-semibold text-green-700">{userSummary.working ?? 0}</div>
                  </div>
                  <div className="p-3 rounded bg-white shadow-sm text-center">
                    <div className="text-sm text-gray-500">On Leave</div>
                    <div className="text-xl font-semibold text-blue-600">{userSummary.leave ?? 0}</div>
                  </div>
                  <div className="p-3 rounded bg-white shadow-sm text-center">
                    <div className="text-sm text-gray-500">Missed</div>
                    <div className="text-xl font-semibold text-red-600">{userSummary.missed ?? 0}</div>
                  </div>
                </div>
              </div>

              {loadingDetail ? (
                <div className="text-sm text-gray-500">Loading month...</div>
              ) : (
                <>
                  {/* Calendar (unchanged) */}
                  <div className="overflow-x-auto">
                    <table className="table-auto w-full border-collapse text-center">
                      <thead>
                        <tr>{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(h => (<th key={h} className="border p-2">{h}</th>))}</tr>
                      </thead>
                      <tbody>
                        {weeks.map((week, wi) => (
                          <tr key={wi}>
                            {week.map((d, ci) => {
                              const cellClass = d ? (STATUS_COLORS[d.tag] || STATUS_COLORS.Default) : "bg-gray-50 text-black";
                              return (
                                <td
                                  key={ci}
                                  className={`border p-2 align-top min-w-[120px] h-[120px] relative ${cellClass}`}
                                >
                                  {d ? (
                                    <>
                                      <div className="flex justify-between items-center mb-1 px-1">
                                        <span className="font-bold">{d.day}</span>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${cellClass}`}>{d.tag}</span>
                                      </div>
                                      <div className="text-sm mb-2 h-10 overflow-hidden text-ellipsis text-left">
                                        {editingDay === d.date ? (
                                          <textarea value={d.fullNote} onChange={e=>handleDayChange(d.date,'fullNote',e.target.value)} className="w-full h-20 p-1 border rounded" />
                                        ) : <div>{d.displayNote}</div>}
                                      </div>
                                      {editingDay === d.date ? (
                                        <div className="flex gap-2 justify-end">
                                          <select value={d.tag} onChange={e=>handleDayChange(d.date,'tag',e.target.value)} className="px-2 py-1 rounded border text-sm">
                                            {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                          </select>
                                          <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={() => saveDay(d)}><CheckIcon className="h-4 w-4"/></button>
                                          <button className="px-2 py-1 bg-gray-300 rounded" onClick={() => cancelEdit()}><XMarkIcon className="h-4 w-4"/></button>
                                        </div>
                                      ) : (
                                        <div className="flex justify-end">
                                          <button className="px-2 py-1 bg-indigo-600 text-white rounded text-sm flex items-center gap-1" onClick={() => startEdit(d.date)}>
                                            <PencilIcon className="h-4 w-4"/> Edit
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  ) : null}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Charts (unchanged) */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pie chart */}
                    <div className="w-full h-64 bg-white p-2 rounded shadow-sm">
                      <h3 className="text-sm font-semibold mb-2">Monthly Distribution</h3>
                      <ResponsiveContainer width="100%" height="90%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Working', value: userSummary.working ?? 0 },
                              { name: 'On Leave', value: userSummary.leave ?? 0 },
                              { name: 'Missed', value: userSummary.missed ?? 0 },
                              { name: 'Holiday', value: userSummary.holiday ?? 0 }
                            ]}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={70}
                            label
                          >
                            <Cell fill={COLORS.working} />
                            <Cell fill={COLORS.onleave} />
                            <Cell fill={COLORS.missed} />
                            <Cell fill={COLORS.holiday} />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Daily reporting line */}
                    <div className="w-full h-64 bg-white p-2 rounded shadow-sm">
                      <h3 className="text-sm font-semibold mb-2">Daily Reporting</h3>
                      <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={days.map(d => ({ day: d.day, reported: (d.tag === 'Working' || d.tag === 'Holiday' || d.tag === 'On Leave') ? 1 : 0 }))}>
                          <Line type="monotone" dataKey="reported" stroke="#3182CE" strokeWidth={2} />
                          <CartesianGrid stroke="#eee" />
                          <XAxis dataKey="day" />
                          <YAxis ticks={[0,1]} />
                          <Tooltip />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Large stacked percents again (unchanged) */}
                  <div className="mt-6 bg-white p-2 rounded shadow-sm">
                    <h3 className="text-sm font-semibold mb-2">Overall Users Performance — {year}-{pad(month)}</h3>
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pctChartData} margin={{ left: 10, right: 10 }}>
                          <CartesianGrid stroke="#eee" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis unit="%" domain={[0,100]} />
                          <Tooltip content={<ChartTooltip />} />
                          <Legend />
                          <Bar dataKey="WorkingPct" stackId="a" fill={COLORS.working} />
                          <Bar dataKey="OnLeavePct" stackId="a" fill={COLORS.onleave} />
                          <Bar dataKey="MissedPct" stackId="a" fill={COLORS.missed} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">Tooltip shows raw counts and percentages for each employee.</div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
