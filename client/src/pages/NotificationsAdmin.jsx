// src/components/NotificationsAdmin.jsx
import React, { useEffect, useMemo, useState, useContext } from "react";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";

/**
 * NotificationsAdmin
 * - aligned to backend controller /fcm/admin/send
 * - sends: { title, body, allUsers } OR { deviceToken } OR { userId } OR { userIds: [...] }
 * - displays server response, and (if backend returns it) lists which users were skipped due to no tokens
 */

export default function NotificationsAdmin() {
  const { user } = useContext(AuthContext);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("user"); // user | users | device | all
  const [singleUserId, setSingleUserId] = useState("");
  const [deviceToken, setDeviceToken] = useState("");

  // candidates fetched for selection
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMap, setSelectedMap] = useState({}); // { userId: true }

  // send state
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  // fetch candidate list
  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoadingCandidates(true);
      try {
        const res = await api.get("/candidates");
        const list = res.data?.data || res.data || [];
        if (!mounted) return;
        // normalize
        const normalized = list.map(c => ({
          _id: c._id || c.id,
          name: c.firstName ? `${c.firstName} ${c.lastName || ""}`.trim() : (c.name || ""),
          email: c.email || "",
          raw: c
        }));
        setCandidates(normalized);
      } catch (err) {
        console.error("Could not fetch candidates", err);
        setCandidates([]);
      } finally {
        if (mounted) setLoadingCandidates(false);
      }
    };
    fetch();
    return () => (mounted = false);
  }, []);

  const filteredCandidates = useMemo(() => {
    const q = (search || "").toLowerCase().trim();
    if (!q) return candidates;
    return candidates.filter(c =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c._id || "").toString().toLowerCase().includes(q)
    );
  }, [candidates, search]);

  const toggleSelect = (id) =>
    setSelectedMap(prev => {
      const clone = { ...prev };
      if (clone[id]) delete clone[id];
      else clone[id] = true;
      return clone;
    });

  const selectAllVisible = () => {
    const map = { ...selectedMap };
    filteredCandidates.forEach(c => { if (c._id) map[c._id] = true; });
    setSelectedMap(map);
  };

  const clearSelection = () => setSelectedMap({});

  const selectedIds = useMemo(() => Object.keys(selectedMap), [selectedMap]);

  const canSend = title.trim() && body.trim() && (
    target === "all" ||
    (target === "device" && deviceToken.trim()) ||
    (target === "user" && singleUserId.trim()) ||
    (target === "users" && selectedIds.length > 0)
  );

  const handleSend = async () => {
    setResult(null);
    if (!canSend) return;
    setSending(true);

    try {
      const payload = { title: String(title), body: String(body) };

      if (target === "all") {
        payload.allUsers = true;
      } else if (target === "device") {
        payload.deviceToken = String(deviceToken).trim();
      } else if (target === "user") {
        // Check if it's an email or ID
        const input = singleUserId.trim();
        if (input.includes('@')) {
          payload.email = input;
        } else {
          // Try as userId first, but backend will also try candidateId if userId fails
          payload.userId = input;
        }
      } else if (target === "users") {
        // Send candidateIds - backend will resolve to userIds
        payload.candidateIds = selectedIds;
      }

      console.log("[NotificationsAdmin] 📤 Sending notification with payload:", payload);

      // call adminSend route (data-only)
      const res = await api.post("/fcm/admin/send", payload);

      // backend returns { success: true, tokensSent, successCount, failureCount, skipped, responses }
      const data = res.data || {};
      const tokensSent = data.tokensSent ?? data.successCount ?? (data.success ? (data.responses?.length || 0) : 0);

      // Build friendly result structure for UI:
      const uiResult = {
        ok: true,
        raw: data,
        tokensSent: tokensSent,
        totalTokens: data.totalTokens || 0,
        successCount: data.successCount || tokensSent,
        failureCount: data.failureCount || 0,
        responses: data.responses || [],
        skipped: data.skipped || null
      };

      // Show warning if some were skipped
      if (target === "users" && uiResult.skipped && uiResult.skipped.length > 0) {
        uiResult.warning = `Sent to ${uiResult.tokensSent} tokens. ${uiResult.skipped.length} candidate(s) were skipped (no linked user or no FCM token).`;
      } else if (target === "users" && uiResult.tokensSent !== null && uiResult.tokensSent < selectedIds.length && !uiResult.skipped) {
        uiResult.warning = `Sent to ${uiResult.tokensSent} tokens out of ${selectedIds.length} selected candidates. Some candidates may not have linked users or FCM tokens.`;
      }

      setResult(uiResult);
    } catch (err) {
      console.error("Send error", err);
      setResult({ ok: false, error: err?.response?.data || { message: err.message } });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
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
            <label className="flex items-center gap-2"><input type="radio" name="target" value="user" checked={target === 'user'} onChange={() => setTarget('user')} />Single User</label>
            <label className="flex items-center gap-2"><input type="radio" name="target" value="users" checked={target === 'users'} onChange={() => setTarget('users')} />Selected Users (pick below)</label>
            <label className="flex items-center gap-2"><input type="radio" name="target" value="device" checked={target === 'device'} onChange={() => setTarget('device')} />Device Token</label>
            <label className="flex items-center gap-2"><input type="radio" name="target" value="all" checked={target === 'all'} onChange={() => setTarget('all')} />All Users</label>
          </div>
        </div>

        {target === 'user' && (
          <div>
            <label className="block text-sm font-medium">User ID or Email</label>
            <input value={singleUserId} onChange={e => setSingleUserId(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="User ID (e.g. 64f...) or Email (e.g. user@example.com)" />
            <div className="text-xs text-gray-500 mt-1">Enter either a User ID or Email address. Backend will resolve tokens for this user. If no token is found, the server returns 404 / message.</div>
          </div>
        )}

        {target === 'users' && (
          <div className="border rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-sm font-medium">Pick candidates</label>
                <div className="text-xs text-gray-500">This will pass selected candidate IDs to the backend; the backend will resolve them to user IDs and send only to users with tokens. Returns count of tokens sent and list of skipped candidates.</div>
              </div>
              <div className="flex gap-2">
                <button onClick={selectAllVisible} className="px-2 py-1 bg-indigo-600 text-white rounded text-sm">Select visible</button>
                <button onClick={clearSelection} className="px-2 py-1 bg-gray-200 rounded text-sm">Clear</button>
              </div>
            </div>

            <div className="mb-2">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name/email/id" className="w-full border rounded px-2 py-1 text-sm" />
            </div>

            <div className="max-h-64 overflow-auto">
              {loadingCandidates ? (
                <div className="text-sm text-gray-500">Loading candidates...</div>
              ) : filteredCandidates.length === 0 ? (
                <div className="text-sm text-gray-500">No candidates found.</div>
              ) : (
                <div className="space-y-1">
                  {filteredCandidates.map(c => (
                    <label key={c._id} className="flex items-center justify-between gap-2 p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={!!selectedMap[c._id]} onChange={() => toggleSelect(c._id)} />
                        <div>
                          <div className="text-sm font-medium">{c.name || c.email || c._id}</div>
                          <div className="text-xs text-gray-500">{c.email || c._id}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-2 text-sm text-gray-600">Selected: <strong>{selectedIds.length}</strong></div>
          </div>
        )}

        {target === 'device' && (
          <div>
            <label className="block text-sm font-medium">Device Token</label>
            <textarea value={deviceToken} onChange={e => setDeviceToken(e.target.value)} className="w-full border rounded px-3 py-2" rows={3} placeholder="Paste an FCM device token here" />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button onClick={handleSend} disabled={!canSend || sending} className={`px-4 py-2 rounded text-white ${sending ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}>
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>

        {result && (
          <div className={`mt-3 p-3 rounded ${result.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            {result.ok ? (
              <>
                <div className="text-sm font-semibold text-green-800 mb-2">Send completed</div>
                <pre className="bg-white p-2 rounded overflow-auto max-h-48 text-xs">{JSON.stringify(result.raw || result, null, 2)}</pre>

                {/* If backend returns per-user resolution (recommended backend change), show resolved/skipped */}
                {result.raw?.resolved && (
                  <div className="mt-2 text-sm">
                    <div className="font-medium">Users with tokens:</div>
                    <ul className="list-disc pl-5">
                      {result.raw.resolved.map(u => <li key={u.userId}>{u.userId} ({u.count} tokens)</li>)}
                    </ul>
                  </div>
                )}

                {result.skipped && result.skipped.length > 0 && (
                  <div className="mt-2 text-sm text-red-700">
                    <div className="font-medium">Skipped ({result.skipped.length}):</div>
                    <ul className="list-disc pl-5 max-h-32 overflow-auto">
                      {result.skipped.map((item, idx) => (
                        <li key={idx}>
                          {item.name || item.email || item.candidateId || item.userId} 
                          {item.reason && <span className="text-gray-600"> - {item.reason}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* If UI computed a warning (because backend didn't return per-user skipped list) */}
                {result.warning && <div className="mt-2 text-sm text-yellow-700">{result.warning}</div>}
              </>
            ) : (
              <>
                <div className="text-sm font-semibold text-red-700 mb-2">Send failed</div>
                <pre className="bg-white p-2 rounded overflow-auto max-h-48 text-xs">{JSON.stringify(result.error || result, null, 2)}</pre>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
