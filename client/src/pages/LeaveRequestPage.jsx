// EmployeeLeavePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

/**
 * Modern Employee Leave page with stylish animated modal
 */

function StatusBadge({ status }) {
  const map =
    status === "approved"
      ? "bg-green-100 text-green-800"
      : status === "rejected"
      ? "bg-red-100 text-red-800"
      : "bg-yellow-100 text-yellow-800";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-sm font-medium capitalize ${map}`}
    >
      {status}
    </span>
  );
}

const todayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

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

export default function EmployeeLeavePage() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState({ open: false, id: null });
  const [infoMessage, setInfoMessage] = useState("");

  const minDate = todayISO();

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return computeDays(startDate, endDate);
  }, [startDate, endDate]);

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      // use the new /leaves/me endpoint
      const res = await api.get("/leaves/me");
      const raw = res.data?.data || [];
      // ensure days field exists
      const normalized = raw.map((l) => ({
        ...l,
        days: typeof l.days === "number" ? l.days : computeDays(l.startDate, l.endDate),
      }));
      setLeaves(normalized);
    } catch (err) {
      console.error("Fetch leaves error", err);
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setReason("");
    setEditingId(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!startDate || !endDate) return setError("Start and end dates are required.");
    if (new Date(endDate) < new Date(startDate)) return setError("End date must be after start date.");
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/leaves/${editingId}`, {
          startDate,
          endDate,
          reason,
        });
        setInfoMessage("Leave updated");
      } else {
        await api.post("/leaves", { startDate, endDate, reason });
        setInfoMessage("Leave applied");
      }
      resetForm();
      await fetchLeaves();
      setTimeout(() => setInfoMessage(""), 2500);
    } catch (err) {
      console.error("Save error", err);
      setError(err?.response?.data?.message || "Could not save leave");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (l) => {
    setEditingId(l._id);
    setStartDate((l.startDate || "").slice(0, 10));
    setEndDate((l.endDate || "").slice(0, 10));
    setReason(l.reason || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmDelete = (id) => setConfirm({ open: true, id });
  const cancelDelete = () => setConfirm({ open: false, id: null });

  const doDelete = async () => {
    const id = confirm.id;
    if (!id) return;
    try {
      await api.delete(`/leaves/${id}`);
      setInfoMessage("Leave deleted");
      setTimeout(() => setInfoMessage(""), 2500);
      await fetchLeaves();
    } catch (err) {
      console.error("Delete error", err);
      alert(err?.response?.data?.message || "Could not delete leave");
    } finally {
      cancelDelete();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* HEADER */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Apply for Leave</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage your leaves with real-time tracking and updates.
            </p>
          </div>
        </header>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-2xl shadow-md mb-6 transform transition hover:shadow-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                min={minDate}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                min={minDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
              <div className="h-10 flex items-center justify-center rounded-lg bg-gray-100 font-semibold text-gray-800">
                {days || 0}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full border rounded-lg p-3 focus:ring-2 focus:ring-indigo-200 resize-none"
              placeholder="Why are you taking this leave?"
            ></textarea>
          </div>

          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow"
            >
              {saving ? "Saving..." : editingId ? "Update" : "Apply"}
            </button>

            {editingId && (
              <button type="button" onClick={resetForm} className="px-3 py-2 border rounded-lg">
                Cancel
              </button>
            )}

            {infoMessage && <div className="ml-auto text-sm text-green-600 font-medium">{infoMessage}</div>}
          </div>
        </form>

        {/* LEAVE LIST */}
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Your Leaves</h2>

          {loading ? (
            <div className="text-gray-500">Loading...</div>
          ) : leaves.length === 0 ? (
            <div className="text-gray-500">You have not applied for any leaves yet.</div>
          ) : (
            <div className="space-y-3">
              {leaves.map((l) => (
                <article
                  key={l._id}
                  className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition flex flex-col md:flex-row justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Applied: {new Date(l.createdAt).toLocaleString()}</div>
                        <div className="mt-1 text-base font-semibold text-gray-800">
                          {new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Days: <span className="font-medium">{l.days}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <StatusBadge status={l.status} />
                      </div>
                    </div>

                    <p className="mt-3 text-gray-700">{l.reason || <span className="text-gray-400 italic">No reason provided</span>}</p>

                    {l.comment && (
                      <p className="mt-2 text-sm text-gray-600">
                        <strong>Admin note:</strong> <span className="italic">{l.comment}</span>
                      </p>
                    )}

                    {l.reviewedBy && (
                      <p className="mt-3 text-sm text-gray-700">
                        <strong>Reviewed by:</strong>{" "}
                        <span className="text-gray-900">{l.reviewedBy.firstName} {l.reviewedBy.lastName}</span>{" "}
                        <span className="text-gray-500">({l.reviewedBy.email})</span>
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                    {l.status === "pending" ? (
                      <>
                        <button onClick={() => startEdit(l)} className="px-3 py-1 border rounded-lg hover:bg-gray-100">
                          Edit
                        </button>
                        <button onClick={() => confirmDelete(l._id)} className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700">
                          Delete
                        </button>
                      </>
                    ) : (
                      <div className="text-sm text-gray-500 italic">{l.status === "approved" ? "Approved" : "Rejected"}</div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Delete confirm modal */}
      {confirm.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-md animate-fadeIn"
          style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white/90 backdrop-saturate-150 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all duration-300 animate-scaleUp">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this leave? This action cannot be undone.</p>

            <div className="flex justify-end gap-3">
              <button onClick={cancelDelete} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition">
                Cancel
              </button>
              <button onClick={doDelete} className="px-4 py-2 rounded-lg shadow text-white bg-red-600 hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
