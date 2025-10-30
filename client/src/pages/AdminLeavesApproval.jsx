// AdminLeavePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

/**
 * AdminLeavePage (client-side search & filters)
 * - Fetches all candidates and leaves once
 * - Performs search/filter locally
 */

function StatusPill({ status }) {
  const map = {
    approved: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    rejected: "bg-red-100 text-red-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-medium ${map[status] || map.pending}`}>
      {status}
    </span>
  );
}

function IconSearch() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" />
    </svg>
  );
}

function computeDays(startDate, endDate) {
  try {
    const s = new Date(startDate);
    const e = new Date(endDate);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    return Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
  } catch {
    return 0;
  }
}

export default function AdminLeavePage() {
  const [candidates, setCandidates] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Filters / UI state
  const [globalSearch, setGlobalSearch] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // modal state
  const [modal, setModal] = useState({ open: false, id: null, action: null, comment: "" });
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // fetch candidates
  const fetchCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const res = await api.get("/candidates"); // protected route (hr/admin)
      setCandidates(res.data?.data || []);
    } catch (err) {
      console.error("Could not fetch candidates", err);
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  };

  // fetch leaves (admin should get all leaves)
  const fetchLeaves = async () => {
    setLoadingLeaves(true);
    try {
      // request all leaves; controller supports limit/skip — passing limit=0 means "no limit" in our controller
      const res = await api.get("/leaves?limit=0");
      const raw = res.data?.data || [];
      // normalize days
      const normalized = raw.map((l) => ({ ...l, days: typeof l.days === "number" ? l.days : computeDays(l.startDate, l.endDate) }));
      setLeaves(normalized);
    } catch (err) {
      console.error("Could not fetch leaves", err);
      setLeaves([]);
    } finally {
      setLoadingLeaves(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchLeaves();
  }, []);

  // filtered candidate list for dropdown (searchable)
  const filteredCandidates = useMemo(() => {
    if (!candidateQuery) return candidates;
    const q = candidateQuery.toLowerCase();
    return candidates.filter((c) => {
      const fullname = `${c.firstName || c.name || ""} ${c.lastName || ""}`.toLowerCase();
      const email = (c.email || "").toLowerCase();
      return fullname.includes(q) || email.includes(q);
    });
  }, [candidates, candidateQuery]);

  // parse date filter values to Date objects (or null)
  const parsedFrom = useMemo(() => (dateFrom ? new Date(dateFrom) : null), [dateFrom]);
  const parsedTo = useMemo(() => (dateTo ? new Date(dateTo) : null), [dateTo]);

  // client-side leaves filtering
  const filteredLeaves = useMemo(() => {
    const q = (globalSearch || "").trim().toLowerCase();

    return leaves.filter((l) => {
      // appliedBy might be populated (object) — check name/email
      const name = (l.appliedBy?.firstName ? `${l.appliedBy.firstName} ${l.appliedBy.lastName || ""}` : l.appliedBy?.name || "").toLowerCase();
      const email = (l.appliedBy?.email || "").toLowerCase();

      // 1) global search (name or email)
      if (q) {
        if (!name.includes(q) && !email.includes(q)) return false;
      }

      // 2) candidate filter
      if (selectedCandidate) {
        const appliedId = (l.appliedBy && typeof l.appliedBy === "object") ? (l.appliedBy._id || l.appliedBy.id) : l.appliedBy;
        if (!appliedId) return false;
        if (String(appliedId) !== String(selectedCandidate)) return false;
      }

      // 3) status filter
      if (statusFilter) {
        if (l.status !== statusFilter) return false;
      }

      // 4) date range filter — include leaves that overlap the selected range
      if (parsedFrom || parsedTo) {
        const leaveStart = new Date(l.startDate);
        const leaveEnd = new Date(l.endDate);
        if (parsedFrom && leaveEnd < parsedFrom) return false;
        if (parsedTo && leaveStart > parsedTo) return false;
      }

      return true;
    });
  }, [leaves, globalSearch, selectedCandidate, statusFilter, parsedFrom, parsedTo]);

  // open modal for approve/reject
  function openDecisionModal(id, action) {
    setModal({ open: true, id, action, comment: "" });
  }

  // submit decision
  async function submitDecision() {
    const { id, action, comment } = modal;
    if (!id) return;
    setSubmittingDecision(true);
    try {
      await api.patch(`/leaves/${id}`, { status: action === "approve" ? "approved" : "rejected", comment });
      setModal({ open: false, id: null, action: null, comment: "" });
      await fetchLeaves();
    } catch (err) {
      console.error("Decision error", err);
      alert(err?.response?.data?.message || "Could not update status — see console");
    } finally {
      setSubmittingDecision(false);
    }
  }

  const resetFilters = () => {
    setGlobalSearch("");
    setCandidateQuery("");
    setSelectedCandidate("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Leave Management</h1>
          <a href="/" className="text-indigo-600 hover:underline">Employee Page</a>
        </header>

        {/* Filters panel */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-700 mb-1 block">Search (name or email)</label>
            <div className="relative">
              <div className="absolute left-3 top-3"><IconSearch /></div>
              <input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search by name or email"
                className="pl-10 pr-3 py-2 border rounded-md w-full focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-700 mb-1 block">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full border p-2 rounded-md">
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            <div>
              <label className="text-sm text-gray-700 mb-1 block">From date</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full border p-2 rounded-md" />
            </div>
            <div>
              <label className="text-sm text-gray-700 mb-1 block">To date</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full border p-2 rounded-md" />
            </div>
          </div>

          <div className="md:col-span-4 flex gap-3 justify-end">
            <button onClick={resetFilters} className="px-3 py-2 border rounded-md">Reset filters</button>
            <button onClick={() => fetchLeaves()} className="px-3 py-2 bg-indigo-600 text-white rounded-md">Refresh</button>
          </div>
        </div>

        {/* Leaves list */}
        <main>
          {loadingLeaves ? (
            <div className="text-gray-500">Loading leaves...</div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600">Showing {filteredLeaves.length} of {leaves.length} leaves</div>

              {filteredLeaves.length === 0 ? (
                <div className="text-gray-500">No leaves match the current filters</div>
              ) : (
                <div className="grid gap-4">
                  {filteredLeaves.map((l) => (
                    <div key={l._id} className="bg-white p-4 rounded-xl shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm text-gray-500">{new Date(l.createdAt).toLocaleString()}</div>
                            <div className="mt-1 text-lg font-semibold text-gray-800">
                              {l.appliedBy?.firstName ? `${l.appliedBy.firstName} ${l.appliedBy.lastName || ""}` : (l.appliedBy?.name || "Unknown")}
                            </div>
                            <div className="text-sm text-gray-600">{l.appliedBy?.email}</div>
                          </div>

                          <div className="text-right">
                            <StatusPill status={l.status} />
                            <div className="mt-2 text-sm text-gray-600">Days: <span className="font-medium">{l.days ?? computeDays(l.startDate, l.endDate)}</span></div>
                          </div>
                        </div>

                        <div className="mt-3 text-gray-700">
                          <div className="text-sm"><strong>Dates:</strong> {new Date(l.startDate).toLocaleDateString()} — {new Date(l.endDate).toLocaleDateString()}</div>
                          <div className="mt-2"><strong>Reason:</strong> {l.reason || <span className="text-gray-400">No reason provided</span>}</div>
                          {l.comment && <div className="mt-2 text-sm text-gray-600"><strong>Comment:</strong> {l.comment}</div>}
                        </div>
                      </div>

                      <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                        {l.status === "pending" ? (
                          <>
                            <button onClick={() => openDecisionModal(l._id, "approve")} className="px-4 py-2 bg-green-600 text-white rounded-md shadow">Approve</button>
                            <button onClick={() => openDecisionModal(l._1d, "reject")} className="px-4 py-2 bg-red-600 text-white rounded-md">Reject</button>
                          </>
                        ) : (
                          <div className="text-sm text-gray-500 italic">{l.status === 'approved' ? 'Approved' : 'Rejected'}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        {/* Decision modal */}
        {modal.open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-md animate-fadeIn"
            style={{
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <div className="bg-white/90 backdrop-saturate-150 rounded-2xl shadow-2xl max-w-lg w-full p-6 transform transition-all duration-300 scale-100 animate-scaleUp">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {modal.action === "approve" ? "Approve" : "Reject"} Leave
              </h3>
              <p className="text-sm text-gray-600 mb-4">Add an optional comment for the user (will be visible on their leave details).</p>

              <textarea
                rows={4}
                value={modal.comment}
                onChange={(e) => setModal({ ...modal, comment: e.target.value })}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none mb-4 bg-white/60"
                placeholder="Type a comment (optional)..."
              ></textarea>

              <div className="flex justify-end gap-3">
                <button onClick={() => setModal({ open: false, id: null, action: null, comment: "" })} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition">Cancel</button>
                <button onClick={submitDecision} disabled={submittingDecision} className={`px-4 py-2 rounded-lg shadow text-white transition ${modal.action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"} ${submittingDecision ? "opacity-70 cursor-not-allowed" : ""}`}>
                  {submittingDecision ? "Processing..." : modal.action === "approve" ? "Approve" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
