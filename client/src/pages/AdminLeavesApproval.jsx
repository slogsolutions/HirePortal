import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function AdminLeavePage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");

  const fetchLeaves = async (userId = "") => {
    setLoading(true);
    try {
      const url = userId ? `/leaves?userId=${userId}` : "/leaves?future=true";
      const res = await api.get(url);
      setLeaves(res.data?.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/candidates"); // fetch all users/candidates
      setUsers(res.data?.data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchLeaves();
    fetchUsers();
  }, []);

  const handleStatusChange = async (id, status, comment = "") => {
    try {
      await api.patch(`/leaves/${id}`, { status, comment });
      fetchLeaves(selectedUser);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-semibold mb-4">Admin Leave Management</h2>

      <div className="mb-4">
        <label className="mr-2 font-medium">Filter by User:</label>
        <select value={selectedUser} onChange={e => { setSelectedUser(e.target.value); fetchLeaves(e.target.value); }} className="border p-2 rounded">
          <option value="">All Users</option>
          {users.map(u => (
            <option key={u._id} value={u._id}>{u.firstName || u.name} ({u.email})</option>
          ))}
        </select>
      </div>

      {loading ? <div>Loading...</div> :
        leaves.length === 0 ? <div>No leaves found</div> :
        <div className="space-y-4">
          {leaves.map(l => (
            <div key={l._id} className="bg-white p-4 rounded shadow flex justify-between items-start gap-4">
              <div className="flex-1">
                <div><strong>{l.appliedBy?.firstName || l.appliedBy?.name || "Unknown"}</strong> ({l.appliedBy?.email})</div>
                <div>{new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()} • {l.days} day(s)</div>
                <div>Reason: {l.reason}</div>
                <div>Status: <span className={
                  l.status === 'approved' ? 'text-green-600' : l.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                }>{l.status}</span> {l.comment && `• Comment: ${l.comment}`}</div>
              </div>
              {l.status === 'pending' && (
                <div className="flex flex-col gap-2">
                  <input type="text" placeholder="Add comment" className="border p-1 rounded mb-1" onChange={e => l.comment = e.target.value} />
                  <button onClick={() => handleStatusChange(l._id, 'approved', l.comment)} className="bg-green-600 text-white px-3 py-1 rounded">Approve</button>
                  <button onClick={() => handleStatusChange(l._id, 'rejected', l.comment)} className="bg-red-600 text-white px-3 py-1 rounded">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      }
    </div>
  );
}
