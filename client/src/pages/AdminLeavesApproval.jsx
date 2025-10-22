// AdminLeavePage.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function AdminLeavePage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await api.get("/leaves?future=true");
      setLeaves(res.data?.data || []);
    } catch(err){ console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLeaves(); }, []);

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/leaves/${id}`, { status });
      fetchLeaves();
    } catch(err){ console.error(err); }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="text-3xl font-semibold mb-4">Admin Leave Management</h2>

      {loading ? <div>Loading...</div> :
        leaves.length === 0 ? <div>No leaves found</div> :
        <div className="space-y-4">
          {leaves.map(l => (
            <div key={l._id} className="bg-white p-4 rounded shadow flex justify-between items-center">
              <div>
                <div><strong>{l.appliedBy?.firstName || l.appliedBy?.name || "Unknown"}</strong> ({l.appliedBy?.email})</div>
                <div>{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()} • {l.days} day(s)</div>
                <div>Reason: {l.reason}</div>
                <div>Status: {l.status} {l.comment && `• Note: ${l.comment}`}</div>
              </div>
              {l.status==='pending' && (
                <div className="flex gap-2">
                  <button onClick={()=>handleStatusChange(l._id, 'accepted')} className="bg-green-600 text-white px-3 py-1 rounded">Accept</button>
                  <button onClick={()=>handleStatusChange(l._id, 'rejected')} className="bg-red-600 text-white px-3 py-1 rounded">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      }
    </div>
  );
}
