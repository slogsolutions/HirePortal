// src/pages/AdminAttendancePage.jsx
// Admin dashboard: filter by range and user; view aggregated tag counts per user
// Expects `api` axios instance at '../lib/api'

import React, { useEffect, useState } from 'react';
import api from '../api/axios'; 

function dateISO(d) {
  if (!d) return '';
  const dt = new Date(d);
  // returns YYYY-MM-DD
  return dt.toISOString().slice(0, 10);
}

export default function AdminAttendancePage() {
  const today = new Date();
  const firstOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0,10);

  const [start, setStart] = useState(firstOfMonth);
  const [end, setEnd] = useState(dateISO(today));
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    try {
      const res = await api.get('/candidates');
      // backend candidate model returns candidate docs, pick display name and userId
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load users');
    }
  }

  async function loadReport() {
    setLoading(true);
    setError('');
    try {
      const params = { start, end };
      if (selectedUserId) params.userId = selectedUserId;
      const res = await api.get('/attendance/admin/report', { params });
      // res.data.data is expected per controller
      setReport(res.data.data || []);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }

  // Simple CSV export for the currently loaded report
  function exportCSV() {
    if (!report || report.length === 0) { alert('No report to export'); return; }
    const rows = [];
    rows.push(['User', 'Present', 'WFH', 'On Leave', 'Sick', 'Holiday', 'Absent']);
    report.forEach(r => {
      const counts = r.tagCounts || {};
      const username = r.userId || (r._id) || 'unknown';
      rows.push([
        username,
        counts.Present || 0,
        counts.WFH || 0,
        counts['On Leave'] || 0,
        counts.Sick || 0,
        counts.Holiday || 0,
        counts.Absent || 0,
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${start}_to_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Admin — Attendance & Performance</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={start} onChange={e => setStart(e.target.value)} className="p-1 border rounded" />
          <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="p-1 border rounded" />
          <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} className="p-1 border rounded">
            <option value="">-- All users --</option>
            {users.map(u => {
              // u.userId might exist if candidate created linked user; fallback to candidate id
              const uid = u.userId?.[ '_id'] || u.userId || u._id;
              const label = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email || uid;
              return <option key={uid} value={uid}>{label}</option>;
            })}
          </select>
          <button onClick={loadReport} className="px-3 py-1 bg-blue-600 text-white rounded">{loading ? 'Loading...' : 'Load'}</button>
          <button onClick={exportCSV} className="px-3 py-1 border rounded">Export CSV</button>
        </div>
      </div>

      {error && <div className="mb-3 text-red-600">{error}</div>}

      <div className="bg-white border rounded p-3">
        {loading ? (
          <div>Loading report...</div>
        ) : (!report || report.length === 0) ? (
          <div className="text-gray-600">No report loaded. Choose a range and click Load.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">User</th>
                  <th className="p-2">Present</th>
                  <th className="p-2">WFH</th>
                  <th className="p-2">On Leave</th>
                  <th className="p-2">Sick</th>
                  <th className="p-2">Holiday</th>
                  <th className="p-2">Absent</th>
                </tr>
              </thead>
              <tbody>
                {report.map(r => {
                  const counts = r.tagCounts || {};
                  const uid = r.userId || r._id || 'unknown';
                  return (
                    <tr key={uid} className="border-t">
                      <td className="p-2">{uid}</td>
                      <td className="p-2">{counts.Present || 0}</td>
                      <td className="p-2">{counts.WFH || 0}</td>
                      <td className="p-2">{counts['On Leave'] || 0}</td>
                      <td className="p-2">{counts.Sick || 0}</td>
                      <td className="p-2">{counts.Holiday || 0}</td>
                      <td className="p-2">{counts.Absent || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
