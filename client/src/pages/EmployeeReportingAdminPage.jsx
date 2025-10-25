// src/admin/AdminUsersWithDetail.jsx
import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { getDaysInMonth, startOfMonth } from 'date-fns';
import { PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

/*
  Combined Admin page:
  - Left: users + summary (uses /attendance/admin/users and /attendance/admin/report)
  - Right: detail calendar for selected user (uses /attendance/admin/user/:userId and POST /attendance/admin/entries)
*/

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

  // Fetch month for selected user
  const fetchUserMonth = async (userId, y = year, m = month) => {
    if (!userId) return;
    setLoadingDetail(true);
    try {
      const { data } = await api.get(`/attendance/admin/user/${userId}?year=${y}&month=${m}`);
      // data.days should be array with { date, day, tag, note, isSunday, isHoliday, ... }
      // Normalize for UI (ensure fullNote and displayNote)
      const daysData = data.days.map(d => {
        const fullNote = d.note || '';
        let displayNote = fullNote.split(' ').slice(0, 15).join(' ');
        if (fullNote.split(' ').length > 15) displayNote += '...';
        return { ...d, fullNote, displayNote };
      });
      setDays(daysData);
    } catch (err) {
      console.error('[admin] fetchUserMonth error', err);
      setDays([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  // When selectedUser changes, load their month
  useEffect(() => {
    if (selectedUser) fetchUserMonth(selectedUser._id, year, month);
    else setDays([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, year, month]);

  // Start editing: ensure tag select has valid value for editing
  const startEdit = (date) => {
    setDays(prev => prev.map(d => d.date === date ? { ...d, tag: STATUS_OPTIONS.includes(d.tag) ? d.tag : "Working" } : d));
    setEditingDay(date);
  };

  // Handle field changes
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

  // Admin save single day for selected user (uses admin endpoint)
  const saveDay = async (d) => {
    if (!selectedUser) return;
    try {
      const payload = {
        userId: selectedUser._id,
        entries: [{ date: d.date, tag: d.tag, note: d.fullNote || '' }],
        forceEdit: true
      };
      console.log('[admin] sending payload', payload);
      const res = await api.post('/attendance/admin/entries', payload);
      console.log('[admin] save response', res?.data);
      setEditingDay(null);
      // refresh both detail and the aggregated report/users (counts may have changed)
      await fetchUserMonth(selectedUser._id, year, month);
      fetchUsersAndReport();
    } catch (err) {
      console.error('[admin] saveDay error', err);
      await fetchUserMonth(selectedUser._id, year, month);
      fetchUsersAndReport();
    }
  };

  const cancelEdit = () => setEditingDay(null);

  // Calendar building helper (uses days[] which contains day numbers)
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
          const dayObj = days.find(dd => dd.day === dayCounter) || { day: dayCounter, date: new Date(y, m - 1, dayCounter).toISOString().slice(0, 10), tag: 'Working', fullNote: '', displayNote: '' };
          week.push(dayObj);
          dayCounter++;
        }
      }
      weeks.push(week);
    }
    return weeks;
  };

  const weeks = buildWeeks(year, month);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin — Users & Detail</h1>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Users list */}
        <div className="lg:w-1/3 space-y-4">
          <div className="p-3 bg-white rounded shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Users</h2>
              <button
                className="text-sm text-indigo-600"
                onClick={() => fetchUsersAndReport()}
              >
                Refresh
              </button>
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
                    <div key={u._id} className={`p-3 rounded border cursor-pointer ${selectedUser?._id === u._id ? 'bg-indigo-50 border-indigo-200' : 'bg-white'}`} onClick={() => setSelectedUser(u)}>
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

          {/* Quick global actions */}
          <div className="p-3 bg-white rounded shadow-sm">
            <h3 className="font-semibold mb-2">Actions</h3>
            <div className="flex flex-col gap-2">
              <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={() => { setSelectedUser(null); setDays([]); }}>Clear Selection</button>
              <button className="px-3 py-2 bg-gray-100 rounded" onClick={() => fetchUsersAndReport()}>Refresh All</button>
            </div>
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
                  <input type="month" value={`${year}-${String(month).padStart(2,'0')}`} onChange={e=>{ const [y,m]=e.target.value.split('-'); setYear(Number(y)); setMonth(Number(m)); }} className="border rounded px-2 py-1 text-sm" />
                  <button className="text-sm text-gray-600" onClick={() => fetchUserMonth(selectedUser._id, year, month)}>Refresh</button>
                </div>
              </div>

              {loadingDetail ? (
                <div className="text-sm text-gray-500">Loading month...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-auto w-full border-collapse text-center">
                    <thead>
                      <tr>
                        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(h => (<th key={h} className="border p-2">{h}</th>))}
                      </tr>
                    </thead>
                    <tbody>
                      {weeks.map((week, wi) => (
                        <tr key={wi}>
                          {week.map((d, ci) => (
                            <td key={ci} className="border p-2 align-top min-w-[120px] h-[120px] relative">
                              {d ? (
                                <>
                                  <div className="flex justify-between items-center mb-1 px-1">
                                    <span className="font-bold">{d.day}</span>
                                    <span className="text-xs font-medium">{d.tag}</span>
                                  </div>

                                  <div className="text-sm mb-2 h-10 overflow-hidden text-ellipsis">
                                    {editingDay === d.date ? (
                                      <textarea value={d.fullNote} onChange={e=>handleDayChange(d.date,'fullNote',e.target.value)} className="w-full h-20 p-1 border rounded" />
                                    ) : (
                                      <div>{d.displayNote}</div>
                                    )}
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
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
