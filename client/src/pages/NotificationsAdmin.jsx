import React, { useEffect, useMemo, useState, useContext } from "react";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";

export default function NotificationsAdmin() {
  const { user, isAuthenticated } = useContext(AuthContext);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("user"); // user | users | device | all
  const [userId, setUserId] = useState("");
  const [userIds, setUserIds] = useState(""); // comma-separated
  const [deviceToken, setDeviceToken] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const canSend = title.trim() && body.trim();

  const handleSend = async () => {
    setResult(null);
    if (!canSend) return;
    const payload = { title, body };
    if (target === "all") payload.allUsers = true;
    if (target === "device") payload.deviceToken = deviceToken.trim();
    if (target === "user") payload.userId = userId.trim();
    if (target === "users") payload.userIds = userIds.split(",").map(s => s.trim()).filter(Boolean);

    setSending(true);
    try {
      const res = await api.post("/fcm/admin/send", payload);
      setResult({ ok: true, data: res.data });
    } catch (err) {
      setResult({ ok: false, error: err?.response?.data || { message: err.message } });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Send Notification</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Title" />
        </div>
        <div>
          <label className="block text-sm font-medium">Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} className="w-full border rounded px-3 py-2" rows={3} placeholder="Body" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Target</label>
          <div className="flex gap-3 flex-wrap">
            <label className="flex items-center gap-2"><input type="radio" name="target" value="user" checked={target === 'user'} onChange={() => setTarget('user')} />User</label>
            <label className="flex items-center gap-2"><input type="radio" name="target" value="users" checked={target === 'users'} onChange={() => setTarget('users')} />Users (list)</label>
            <label className="flex items-center gap-2"><input type="radio" name="target" value="device" checked={target === 'device'} onChange={() => setTarget('device')} />Device Token</label>
            <label className="flex items-center gap-2"><input type="radio" name="target" value="all" checked={target === 'all'} onChange={() => setTarget('all')} />All Users</label>
          </div>
        </div>

        {target === 'user' && (
          <div>
            <label className="block text-sm font-medium">User ID</label>
            <input value={userId} onChange={e => setUserId(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="e.g. 68d..." />
          </div>
        )}

        {target === 'users' && (
          <div>
            <label className="block text-sm font-medium">User IDs (comma-separated)</label>
            <input value={userIds} onChange={e => setUserIds(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="id1,id2,id3" />
          </div>
        )}

        {target === 'device' && (
          <div>
            <label className="block text-sm font-medium">Device Token</label>
            <textarea value={deviceToken} onChange={e => setDeviceToken(e.target.value)} className="w-full border rounded px-3 py-2" rows={3} placeholder="FCM token" />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={handleSend} disabled={!canSend || sending} className={`px-4 py-2 rounded text-white ${sending ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>

        {result && (
          <div className={`mt-3 text-sm ${result.ok ? 'text-green-700' : 'text-red-700'}`}>
            {result.ok ? (
              <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-60">{JSON.stringify(result.data, null, 2)}</pre>
            ) : (
              <div>
                Error: {result.error?.message || 'Failed'}
                {result.error && (
                  <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-60 mt-2">{JSON.stringify(result.error, null, 2)}</pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


