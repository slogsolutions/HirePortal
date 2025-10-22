import React, { useEffect, useState } from "react";
import api from "../api/axios";

const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

export default function EmployeeLeavePage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const minDate = todayISO();

  const calculateDays = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  };

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await api.get("/leaves?mine=true");
      setLeaves(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLeaves(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) return setError("Start and end dates required");
    setSaving(true);

    try {
      if (editingId) {
        await api.patch(`/leaves/${editingId}`, { startDate, endDate, reason });
      } else {
        await api.post("/leaves", { startDate, endDate, reason });
      }
      setStartDate(""); setEndDate(""); setReason(""); setEditingId(null);
      fetchLeaves();
    } catch (err) {
      console.error(err);
    } finally { setSaving(false); }
  };

  const handleEdit = (leave) => {
    setEditingId(leave._id);
    setStartDate(leave.startDate.slice(0, 10));
    setEndDate(leave.endDate.slice(0, 10));
    setReason(leave.reason);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this leave?")) return;
    try {
      await api.delete(`/leaves/${id}`);
      fetchLeaves();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-3xl font-semibold mb-4">Apply Leave</h2>

      <form onSubmit={handleSubmit} className="bg-white p-5 rounded shadow mb-6">
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <div className="grid grid-cols-2 gap-4 mb-2">
          <input type="date" min={minDate} value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded"/>
          <input type="date" min={minDate} value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded"/>
        </div>
        <div className="mb-2">Days: {calculateDays(startDate, endDate)}</div>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className="w-full p-2 border rounded mb-2" placeholder="Reason"/>
        <div className="flex gap-2">
          {editingId && <button type="button" onClick={() => { setEditingId(null); setStartDate(""); setEndDate(""); setReason(""); }} className="border px-3 py-1 rounded">Cancel</button>}
          <button type="submit" disabled={saving} className="bg-indigo-600 text-white px-3 py-1 rounded">{saving ? "Saving..." : editingId ? "Update" : "Apply"}</button>
        </div>
      </form>

      <h3 className="text-2xl font-semibold mb-2">Your Leaves</h3>
      {loading ? <div>Loading...</div> :
        leaves.length === 0 ? <div>No leaves applied</div> :
        <div className="space-y-4">
          {leaves.map(l => (
            <div key={l._id} className="bg-white p-4 rounded shadow flex justify-between items-center">
              <div>
                <div>{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()} • {l.days} day(s)</div>
                <div>Reason: {l.reason}</div>
                <div>Status: <span className={
                  l.status === 'approved' ? 'text-green-600' : l.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                }>{l.status}</span> {l.comment && `• Note: ${l.comment}`}</div>
              </div>
              {l.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(l)} className="border px-2 py-1 rounded">Edit</button>
                  <button onClick={() => handleDelete(l._id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      }
    </div>
  );
}
