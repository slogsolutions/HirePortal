// src/admin/AdminHolidays.jsx
import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export default function AdminHolidays() {
  const [hols, setHols] = useState([]);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/admin/holidays');
      setHols(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ fetch(); }, []);

  const add = async () => {
    if (!date || !name) return alert('date & name required');
    try {
      await api.post('/attendance/admin/holidays', { date, name });
      setDate(''); setName('');
      fetch();
    } catch (err) { console.error(err); alert('failed'); }
  };

  const remove = async (id) => {
    if (!confirm('Remove holiday?')) return;
    try {
      await api.delete(`/attendance/admin/holidays/${id}`);
      fetch();
    } catch (err) { console.error(err); alert('failed'); }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin — Holidays</h1>

      <div className="mb-4 p-4 bg-white rounded shadow">
        <div className="flex gap-2 items-center">
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border px-2 py-1" />
          <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Holiday name" className="border px-2 py-1" />
          <button onClick={add} className="bg-green-600 text-white px-3 py-1 rounded">Add</button>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        {loading && <div>Loading...</div>}
        <table className="w-full table-auto">
          <thead><tr><th>Date</th><th>Name</th><th></th></tr></thead>
          <tbody>
            {hols.map(h => (
              <tr key={h._id}>
                <td className="p-2 border">{new Date(h.date).toISOString().slice(0,10)}</td>
                <td className="p-2 border">{h.name}</td>
                <td className="p-2 border">
                  <button className="text-red-600" onClick={()=>remove(h._id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
