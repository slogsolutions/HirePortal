// EmpCodeListPage.jsx
import React, { useEffect, useState } from "react";
import api from "../api/axios";
import Modal from "../components/Modal";
import { PencilIcon } from "@heroicons/react/24/outline";

/**
 * EmpCodeListPage
 * - GET /candidates/empcodes  => { data: [...], nextEmpCodeInfo: {...} }
 * - PUT /candidates/:id      => update candidate (send { empCode })
 *
 * Notes:
 * - nextEmpCodeInfo is an object; we only render nextEmpCodeInfo.nextEmpCode (string).
 * - Backend should return proper error messages; we display them to user.
 */

export default function EmpCodeListPage() {
  const [rows, setRows] = useState([]);
  const [nextInfo, setNextInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // modal state
  const [editing, setEditing] = useState(null); // candidate row being edited
  const [modalOpen, setModalOpen] = useState(false);

  // edit fields
  const [empChoice, setEmpChoice] = useState("auto"); // 'auto' | 'manual'
  const [manualEmpCode, setManualEmpCode] = useState("");
  const [predicted, setPredicted] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveWarning, setSaveWarning] = useState(null);
  const [confirmOverride, setConfirmOverride] = useState(false);

  useEffect(() => {
    fetchList();
  }, []);

  async function fetchList() {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await api.get("/candidates/empcodes");
      // res.data: { data: rows, nextEmpCodeInfo }
      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
      setNextInfo(res.data?.nextEmpCodeInfo || null);
      setPredicted(res.data?.nextEmpCodeInfo?.nextEmpCode || null);
    } catch (err) {
      console.error("fetchList error", err);
      setFetchError(
        err?.response?.data?.message || err.message || "Failed to fetch"
      );
      setRows([]);
      setNextInfo(null);
      setPredicted(null);
    } finally {
      setLoading(false);
    }
  }

  // open modal for editing empCode of a candidate
  function openEdit(candidate) {
    setEditing(candidate);
    setModalOpen(true);
    setEmpChoice(candidate.empCode ? "manual" : "auto");
    setManualEmpCode(candidate.empCode || "");
    setSaveError(null);
    setSaveWarning(null);
    setConfirmOverride(false);
    // predicted value from server-level nextInfo; compute fallback
    setPredicted(nextInfo?.nextEmpCode || null);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  // simple client-side validation for empCode format: prefix letters + digits
  function isValidEmpCodeFormat(code) {
    if (!code) return false;
    return /^([A-Za-z]*)(\d+)$/.test(String(code).trim());
  }

  async function handleSaveEmpCode() {
    if (!editing) return;
    setSaveError(null);
    setSaveWarning(null);

    // determine empCode to send
    const empCodeToSend =
      empChoice === "auto" ? predicted || null : manualEmpCode || null;

    if (!empCodeToSend) {
      setSaveError(
        "No empCode selected (auto prediction unavailable or manual empty)."
      );
      return;
    }

    if (!isValidEmpCodeFormat(empCodeToSend)) {
      setSaveError(
        "Invalid empCode format. Use letters followed by digits (e.g. S20813)."
      );
      return;
    }

    // If user must confirm override of sequence, require confirmOverride true
    if (saveWarning && !confirmOverride) {
      setSaveError(
        "Please confirm the override by clicking Confirm and Save in the warning area."
      );
      return;
    }

    setSaving(true);
    try {
      // PUT /candidates/:id with { empCode }
      const id = editing._id;
      const payload = { empCode: String(empCodeToSend).trim() };
      const res = await api.put(`/candidates/${id}`, payload);

      // Backend may return updated candidate. Refresh list.
      await fetchList();
      setSaving(false);
      closeModal();
    } catch (err) {
      setSaving(false);
      console.error("save empCode error", err);
      // The backend might return structured info: message, warning etc.
      const data = err?.response?.data;
      // if backend returns something like { message, warning } show both:
      if (data?.warning) setSaveWarning(data.warning);
      if (data?.message) setSaveError(data.message);
      else
        setSaveError(
          err?.response?.data?.error || err.message || "Save failed"
        );
    }
  }

  // optional: show a small helper string to explain predicted empCode
  const predictedLabel = predicted ? predicted : "—";

  return (
    <div className="max-w-6xl mx-auto p-6 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-6 ">
        <h1 className="text-2xl font-semibold ">
          Employees / Candidate EmpCodes
        </h1>
        <div className="flex gap-2 ">
          <button
            onClick={fetchList}
            className="px-3 py-2 border rounded bg-white dark:bg-emerald-900"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 dark:bg-slate-900">
        <div className="text-sm text-gray-600 dark:bg-slate-900">
          Next predicted empCode:&nbsp;
          <strong>{predictedLabel}</strong>
        </div>
        <div className="mt-3 rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-500 italic dark:bg-slate-700">
          ⚙️ You can change the employee code start number from{" "}
          <code>.env</code>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto dark:bg-slate-800">
        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : fetchError ? (
          <div className="p-6 text-center text-red-600">{fetchError}</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:bg-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  EmpCode
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Mobile
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Designation
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                  Dept
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100 dark:bg-emerald-600">
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.empCode ? (
                      <span className="text-sm font-medium">{r.empCode}</span>
                    ) : (
                      <span className="text-sm text-gray-400">
                        Not assigned
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium">
                      {(r.firstName || "") +
                        (r.lastName ? " " + r.lastName : "")}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {r.email || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {r.mobile || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {r.Designation || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {r.department || "-"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <button
                      onClick={() => openEdit(r)}
                      title="Edit empCode"
                      className="inline-flex items-center gap-2 px-3 py-1 border rounded text-sm hover:bg-gray-50 dark:bg-indigo-600 dark:hover:bg-red-800"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No candidates
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={
          editing
            ? `Edit empCode — ${editing.firstName || ""} ${
                editing.lastName || ""
              }`
            : "Edit empCode"
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              Current empCode:{" "}
              <strong>{editing.empCode || "Not assigned"}</strong>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="empMode"
                    checked={empChoice === "auto"}
                    onChange={() => {
                      setEmpChoice("auto");
                      setSaveError(null);
                      setSaveWarning(null);
                      setConfirmOverride(false);
                    }}
                  />
                  <span className="text-sm">Auto</span>
                </label>

                <div className="text-sm">
                  Predicted: <strong>{nextInfo?.nextEmpCode || "—"}</strong>
                </div>

                <label className="flex items-center gap-2 ml-6">
                  <input
                    type="radio"
                    name="empMode"
                    checked={empChoice === "manual"}
                    onChange={() => {
                      setEmpChoice("manual");
                      setSaveError(null);
                      setSaveWarning(null);
                      setConfirmOverride(false);
                    }}
                  />
                  <span className="text-sm">Manual</span>
                </label>

                <input
                  type="text"
                  value={manualEmpCode}
                  onChange={(e) => {
                    setManualEmpCode(e.target.value);
                    setSaveError(null);
                    setSaveWarning(null);
                    setConfirmOverride(false);
                  }}
                  disabled={empChoice !== "manual"}
                  placeholder="e.g. S20813"
                  className="ml-3 border rounded px-2 py-1 text-sm"
                />
              </div>

              {saveWarning && (
                <div className="text-sm text-yellow-700">
                  {saveWarning}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setConfirmOverride(true)}
                      className="px-2 py-1 bg-yellow-600 text-white rounded text-xs"
                    >
                      Confirm override
                    </button>
                    <div className="text-xs text-gray-600 self-center">
                      After confirming, click Save.
                    </div>
                  </div>
                </div>
              )}

              {saveError && (
                <div className="text-sm text-red-600">{saveError}</div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={closeModal} className="px-3 py-1 border rounded">
                Cancel
              </button>
              <button
                onClick={handleSaveEmpCode}
                disabled={saving}
                className="px-3 py-1 bg-indigo-600 text-white rounded"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
