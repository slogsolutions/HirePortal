// src/admin/AdminUsersWithDetail.jsx
import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { getDaysInMonth, startOfMonth } from 'date-fns';
import { PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, BarChart, Bar } from 'recharts';

/*
  Combined Admin page:
  - Left: users + summary (uses /attendance/admin/users and /attendance/admin/report)
  - Right: detail calendar for selected user (uses /attendance/admin/user/:userId and POST /attendance/admin/entries)
*/

// Color mapping
const STATUS_COLORS = {
  Working: "bg-green-200 text-black",
  "On Leave": "bg-blue-200 text-black",
  Holiday: "bg-yellow-200 text-black",
  Missed: "bg-red-200 text-black",
  Future: "bg-white text-gray-700",
  Sunday: "bg-orange-200 text-black",
  Default: "bg-white text-black",
};

const STATUS_OPTIONS = ["Working","On Leave","Holiday","Missed","Absent"];

export default function AdminUsersWithDetail() {
  const today = new Date();

  // Users/list state
  const [users, setUsers] = useState([]);
  const [report, setReport] = useState([]); // aggregated counts from server
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Selected user & calendar state
  const [selectedUser, setSelectedUser] = useState(null); // { _id, name, email, role }
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [days, setDays] = useState([]);
  const [editingDay, setEditingDay] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [hoveredDay, setHoveredDay] = useState(null);

  // Performance summary
  const [userSummary, setUserSummary] = useState({});
  const [allUsersSummary, setAllUsersSummary] = useState([]);

  // Fetch users & aggregated report
  const fetchUsersAndReport = async () => {
    setLoadingUsers(true);
    try {
      const [uRes, rRes] = await Promise.all([
        api.get('/attendance/admin/users'),
        api.get('/attendance/admin/report')
      ]);
      setUsers(uRes.data || []);
      setReport(rRes.data?.data || []);
    } catch (err) {
      console.error('[admin] fetch users/report error', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => { fetchUsersAndReport(); }, []);

  // Helper: map userId => tagCounts
  const reportMap = {};
  (report || []).forEach(r => { reportMap[r.userId] = r.tagCounts || {}; });

  // Calculate user performance for charts
  const calculateUserPerformance = (days) => {
    let total = 0, working = 0, leave = 0, holiday = 0, missed = 0;

    days.forEach(d => {
      const isSunday = new Date(d.date).getDay() === 0;
      if (!isSunday) {
        total++;
        if (d.tag === 'Working') working++;
        else if (d.tag === 'On Leave') leave++;
        else if (d.tag === 'Holiday') { holiday++; working++; }
        else if (d.tag === 'Missed' || !d.tag) missed++;
      }
    });

    const performance = total > 0 ? ((working + holiday) / total * 100).toFixed(2) : 0;

    return { total, working, leave, holiday, missed, performance };
  };

  // Fetch month for selected user
  const fetchUserMonth = async (userId, y = year, m = month) => {
    if (!userId) return;
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/attendance/admin/user/${userId}?year=${y}&month=${m}`);
      const daysData = data.days.map(d => {
        const fullNote = d.note || '';
        let displayNote = fullNote.split(' ').slice(0, 15).join(' ');
        if (fullNote.split(' ').length > 15) displayNote += '...';
        let tag = d.tag || 'Working';
        if (d.isSunday) tag = 'Sunday';
        const isFuture = new Date(d.date + 'T00:00:00Z') > today;
        if (isFuture) tag = 'Future';
        if (tag === 'On Leave') displayNote = fullNote || 'You are on leave';
        if (tag === 'Missed') displayNote = fullNote || 'No reporting';
        if (tag === 'Holiday') displayNote = fullNote || 'Holiday';
        if (tag === 'Future') displayNote = 'Coming Soon...';
        return { ...d, fullNote, displayNote, tag };
      });
      setDays(daysData);

      // User summary
      const perf = calculateUserPerformance(daysData);
      setUserSummary(perf);

    } catch (err) {
      console.error('[admin] fetchUserMonth error', err);
      setDays([]);
      setUserSummary({});
    } finally {
      setLoadingDetail(false);
    }
  };

  // When selectedUser changes, load their month
  useEffect(() => {
    if (selectedUser) fetchUserMonth(selectedUser._id, year, month);
    else {
      setDays([]);
      setUserSummary({});
    }
  }, [selectedUser, year, month]);

  // Start editing
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
      const res = await api.post('/attendance/admin/entries', payload);
      setEditingDay(null);
      await fetchUserMonth(selectedUser._id, year, month);
      fetchUsersAndReport();
    } catch (err) {
      console.error('[admin] saveDay error', err);
      await fetchUserMonth(selectedUser._id, year, month);
      fetchUsersAndReport();
    }
  };

  const cancelEdit = () => setEditingDay(null);

  // Calendar building helper
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

  // Overall users performance
  useEffect(() => {
    const summary = users.map(u => {
      const t = reportMap[u._id] || {};
      const totalReported = (t.Working || 0) + (t.Holiday || 0);
      const totalDays = 30; // adjust if needed dynamically
      const performance = ((totalReported / totalDays) * 100).toFixed(2);
      return { name: u.name || u.email, performance: Number(performance) };
    });
    setAllUsersSummary(summary);
  }, [users, report]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin — Users & Detail</h1>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Users list */}
        <div className="lg:w-1/3 space-y-4">
          <div className="p-3 bg-white rounded shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Users</h2>
              <button className="text-sm text-indigo-600" onClick={() => fetchUsersAndReport()}>Refresh</button>
            </div>
            {loadingUsers ? (
              <div className="text-sm text-gray-500 mt-2">Loading users...</div>
            ) : (
              <div className="mt-3 space-y-3 max-h-[60vh] overflow-auto">
                {users.map(u => {
                  const t = reportMap[u._id] || {};
                  const working = t.Working || 0;
                  const leave = t["On Leave"] || 0;
                  const missed = t.Missed || 0;
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
        </div>

        {/* Right: Detail area */}
        <div className="lg:w-2/3 bg-white rounded shadow-sm p-4">
          {!selectedUser ? (
            <div className="text-center text-gray-600">Select a user on the left to view / edit their month.</div>
          ) : (
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

              {loadingDetail ? (
                <div className="text-sm text-gray-500">Loading month...</div>
              ) : (
                <>
                  {/* User calendar */}
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
                                  onMouseEnter={() => d && setHoveredDay(d.date)}
                                  onMouseLeave={() => setHoveredDay(null)}
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

                  {/* Charts */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pie chart */}
                    <div className="w-full h-64 bg-white p-2 rounded shadow-sm">
                      <h3 className="text-sm font-semibold mb-2">Monthly Attendance Distribution</h3>
                      <ResponsiveContainer width="100%" height="90%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Working', value: userSummary.working },
                              { name: 'On Leave', value: userSummary.leave },
                              { name: 'Missed', value: userSummary.missed },
                              { name: 'Holiday', value: userSummary.holiday },
                            ]}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={60}
                            label
                          >
                            <Cell fill="#68D391" />
                            <Cell fill="#63B3ED" />
                            <Cell fill="#FC8181" />
                            <Cell fill="#F6E05E" />
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Line chart */}
                    <div className="w-full h-64 bg-white p-2 rounded shadow-sm">
                      <h3 className="text-sm font-semibold mb-2">Daily Reporting</h3>
                      <ResponsiveContainer width="100%" height="90%">
                        <LineChart data={days.map(d => ({
                          day: d.day,
                          reported: (d.tag === 'Working' || d.tag === 'Holiday') ? 1 : 0
                        }))}>
                          <Line type="monotone" dataKey="reported" stroke="#3182CE" />
                          <CartesianGrid stroke="#ccc" />
                          <XAxis dataKey="day" />
                          <YAxis ticks={[0,1]} />
                          <Tooltip />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Overall users performance bar chart */}
                  <div className="mt-6 bg-white p-2 rounded shadow-sm">
                    <h3 className="text-sm font-semibold mb-2">Overall Users Performance</h3>
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={allUsersSummary}>
                          <CartesianGrid stroke="#ccc" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="performance" fill="#3182CE" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
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
