// src/pages/OffersAdmin.jsx
import React, { useEffect, useState, useMemo } from "react";
import api from "../api/axios";
import { Mail, X, Send, User, Plus, Trash2 } from "lucide-react";

// derive API base (strip trailing slash)
const API_BASE =
  (api?.defaults?.baseURL || "").replace(/\/$/, "") ||
  (import.meta?.env?.VITE_API_BASE_URL || "") ||
  window.location.origin;

function toDateOnly(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

export default function OffersAdmin() {
  const [offers, setOffers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [error, setError] = useState(null);

  const [previewOffer, setPreviewOffer] = useState(null); // store full preview URL
  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    candidateId: "",
    designation: "",
    ctc: "",
    joiningDate: "",
    notes: ""
  });

  // Email sending state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedOfferForEmail, setSelectedOfferForEmail] = useState(null);
  const [emailMode, setEmailMode] = useState("candidates"); // "candidates" | "custom"
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [customEmails, setCustomEmails] = useState([""]);
  const [emailSubject, setEmailSubject] = useState("Offer Letter from SLOG Solutions");
  const [emailMessage, setEmailMessage] = useState("Hello,\n\nPlease find attached your offer letter.\n\nRegards,\nHR Team\nSLOG Solutions");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSearch, setEmailSearch] = useState("");

  // cdate filter state (YYYY-MM-DD)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Helper: identifier could be filename (offer-xxx.pdf) or DB id
  const getIdentifier = (o) => {
    // prefer filename (returned by listOffers) since that's what static public URL uses
    if (o.filename) return o.filename;
    return o.id;
  };

  // Build absolute backend URL for preview/download
  const buildBackendOfferUrl = (identifier, action = "preview") => {
    // identifier may already be a filename with .pdf
    const id = encodeURIComponent(identifier);
    if (action === "download") {
      return `${API_BASE}/offers/${id}/download`;
    }
    // preview -> choose preview route
    return `${API_BASE}/offers/${id}/preview`;
  };

  // Fetch offers list
  const fetchOffers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/offers");
      // backend returns { offers: files }
      const rawOffers = data?.offers ?? data ?? [];
      const normalized = rawOffers.map((item) => ({
        id: item.filename ? item.filename.replace(/\.pdf$/i, "") : (item._id || item.id || item.filename),
        filename: item.filename || null,
        url: item.url || null, // already absolute from backend listOffers
        sizeKB: item.sizeKB || null,
        // normalize createdAt to ISO string when possible
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : (item.birthtime ? new Date(item.birthtime).toISOString() : null),
        modifiedAt: item.modifiedAt || item.mtime || null,
        // keep other optional metadata if any
        candidateName: item.candidateName || item.name || null,
        designation: item.designation || null,
        ctc: item.ctc || null,
        status: item.status || null
      }));
      setOffers(normalized);
    } catch (err) {
      console.error("fetchOffers error:", err);
      setError(err?.message || "Failed to fetch offers");
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch candidates (for the generate form)
  const fetchCandidates = async () => {
    setCandidatesLoading(true);
    try {
      const { data } = await api.get("/candidates");
      setCandidates(Array.isArray(data) ? data : data?.candidates || []);
    } catch (err) {
      console.error("fetchCandidates error:", err);
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchOffers();
  }, []);

  // Open preview modal: prefer the backend-provided absolute url (o.url) if present.
  const openPreview = (o) => {
    // o may be the normalized object from state
    const identifier = getIdentifier(o);
    // If listOffers provided an absolute URL, use it — it points directly to /offers/<filename>
    const previewUrl = o.url
      ? o.url
      : buildBackendOfferUrl(identifier, "preview");
    setPreviewOffer({ identifier, previewUrl });
  };

  const closePreview = () => setPreviewOffer(null);

  // Download: open the backend download route (absolute) so router won't intercept
  const downloadOffer = (o) => {
    const identifier = getIdentifier(o);
    const url = buildBackendOfferUrl(identifier, "download");
    // open in new tab/window; this is an absolute URL to the backend endpoint
    window.open(url, "_blank", "noopener,noreferrer");
  };

// Delete: call api.delete('/offers/:offerId') using the identifier (filename or id)

const deleteOffer = async (o) => {
  const identifier = getIdentifier(o);

  // confirmation
  const ok = window.confirm(`Delete offer ${identifier}? This will remove the PDF and DB record (if present).`);
  if (!ok) {
    console.log("User cancelled delete for", identifier);
    return;
  }

  // console message as requested
  console.log("are you sure? Deleting:", identifier);

  try {
    await api.delete(`/offers/${encodeURIComponent(identifier)}`);

    // close preview modal if it was showing the deleted file
    if (previewOffer && previewOffer.identifier === identifier) {
      setPreviewOffer(null);
    }

    alert("Offer deleted");

    // refresh offers from backend
    await fetchOffers();
  } catch (err) {
    await fetchOffers();
    console.error("deleteOffer error:", err);
    // alert(err?.response?.data?.message || err?.message || "Failed to delete offer");
  }
};



  const handleGenerate = async (e) => {
    e.preventDefault();
    const { candidateId, designation, ctc, joiningDate, notes } = generateForm;
    if (!candidateId) return alert("Please select a candidate");
    setGenerating(true);
    try {
      await api.post(`/candidates/${encodeURIComponent(candidateId)}/offer/generate`, {
        designation, ctc, joiningDate, notes
      });
      alert("Offer generated");
      setGenerateForm({ candidateId: "", designation: "", ctc: "", joiningDate: "", notes: "" });
      fetchOffers();
    } catch (err) {
      console.error("generate offer error:", err);
      alert(err?.response?.data?.message || err?.message || "Failed to generate offer");
    } finally {
      setGenerating(false);
    }
  };

  // date-filtered offers (inclusive)
  const filteredOffers = useMemo(() => {
    if (!startDate && !endDate) return offers;
    const start = startDate ? toDateOnly(new Date(startDate)) : null;
    const end = endDate ? toDateOnly(new Date(endDate)) : null;
    return offers.filter(o => {
      if (!o.createdAt) return false;
      const created = toDateOnly(new Date(o.createdAt));
      if (!created) return false;
      if (start && created < start) return false;
      if (end && created > end) return false;
      return true;
    });
  }, [offers, startDate, endDate]);

  const resetDates = () => {
    setStartDate("");
    setEndDate("");
  };

  // Email sending functions
  const openEmailModal = (offer) => {
    setSelectedOfferForEmail(offer);
    setEmailModalOpen(true);
    setSelectedCandidates(new Set());
    setCustomEmails([""]);
    setEmailMode("candidates");
  };

  const closeEmailModal = () => {
    setEmailModalOpen(false);
    setSelectedOfferForEmail(null);
    setSelectedCandidates(new Set());
    setCustomEmails([""]);
    setSendingEmail(false);
  };

  const toggleCandidateSelection = (candidateId) => {
    setSelectedCandidates(prev => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  const selectAllCandidates = () => {
    setSelectedCandidates(new Set(candidates.map(c => c._id || c.id)));
  };

  const clearCandidateSelection = () => {
    setSelectedCandidates(new Set());
  };

  const addCustomEmailField = () => {
    setCustomEmails(prev => [...prev, ""]);
  };

  const updateCustomEmail = (index, value) => {
    setCustomEmails(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removeCustomEmail = (index) => {
    setCustomEmails(prev => prev.filter((_, i) => i !== index));
  };

  const filteredCandidatesForEmail = useMemo(() => {
    if (!emailSearch.trim()) return candidates;
    const query = emailSearch.toLowerCase();
    return candidates.filter(c => 
      (c.firstName || "").toLowerCase().includes(query) ||
      (c.lastName || "").toLowerCase().includes(query) ||
      (c.email || "").toLowerCase().includes(query)
    );
  }, [candidates, emailSearch]);

  const sendOfferEmail = async () => {
    if (!selectedOfferForEmail) return;

    let recipientEmails = [];
    
    if (emailMode === "candidates") {
      if (selectedCandidates.size === 0) {
        alert("Please select at least one candidate");
        return;
      }
      // Get emails from selected candidates
      const selectedCandidatesData = candidates.filter(c => 
        selectedCandidates.has(c._id || c.id)
      );
      recipientEmails = selectedCandidatesData
        .map(c => c.email)
        .filter(email => email && email.includes("@"));
      
      if (recipientEmails.length === 0) {
        alert("Selected candidates don't have valid email addresses");
        return;
      }
    } else {
      // Custom emails
      recipientEmails = customEmails
        .map(email => email.trim())
        .filter(email => email && email.includes("@"));
      
      if (recipientEmails.length === 0) {
        alert("Please enter at least one valid email address");
        return;
      }
    }

    if (!window.confirm(`Send offer letter to ${recipientEmails.length} recipient(s)?\n\n${recipientEmails.slice(0, 5).join(", ")}${recipientEmails.length > 5 ? `\n...and ${recipientEmails.length - 5} more` : ""}`)) {
      return;
    }

    setSendingEmail(true);
    try {
      const identifier = getIdentifier(selectedOfferForEmail);
      const res = await api.post(`/offers/${encodeURIComponent(identifier)}/send-email`, {
        candidateIds: emailMode === "candidates" ? Array.from(selectedCandidates) : undefined,
        customEmails: emailMode === "custom" ? recipientEmails : undefined,
        toArray: recipientEmails, // Also send as array for backward compatibility
        subject: emailSubject,
        message: emailMessage,
      });

      console.log("Email send response:", res.data);
      
      if (res.data.successCount > 0) {
        alert(`✅ Email sent successfully to ${res.data.successCount} recipient(s)${res.data.failureCount > 0 ? `\n❌ ${res.data.failureCount} failed` : ""}`);
        closeEmailModal();
      } else {
        alert(`❌ Failed to send emails. Please check the error details.`);
      }
    } catch (err) {
      console.error("Send email error:", err);
      alert(err?.response?.data?.message || "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto dark:bg-slate-900">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Offers Admin</h1>
          <p className="text-sm text-gray-600">Manage generated offer letters: preview, download, delete and generate new ones.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { fetchCandidates(); fetchOffers(); }} className="px-3 py-2 bg-blue-600 text-white rounded shadow">Refresh</button>
        </div>
      </header>

      <section className="mb-8">
        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="col-span-1 md:col-span-1">
            <label className="text-sm text-gray-700">Candidate</label>
            <select
              value={generateForm.candidateId}
              onChange={e => setGenerateForm({ ...generateForm, candidateId: e.target.value })}
              className="w-full mt-1 p-2 border rounded dark:bg-slate-900"
            >
              <option value="">-- select candidate --</option>
              {candidatesLoading ? (
                <option>Loading...</option>
              ) : candidates.length === 0 ? (
                <option value="">No candidates</option>
              ) : candidates.map(c => (
                <option key={c._id || c.id} value={c._id || c.id}>
                  {c.firstName} {c.lastName} {c.email ? `(${c.email})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-1 md:col-span-1">
            <label className="text-sm text-gray-700">Designation</label>
            <input value={generateForm.designation} onChange={e => setGenerateForm({ ...generateForm, designation: e.target.value })} className="w-full mt-1 p-2 border rounded" placeholder="e.g. Software Engineer" />
          </div>

          <div className="col-span-1 md:col-span-1">
            <label className="text-sm text-gray-700">CTC</label>
            <input value={generateForm.ctc} onChange={e => setGenerateForm({ ...generateForm, ctc: e.target.value })} className="w-full mt-1 p-2 border rounded" placeholder="e.g. 1200000" />
          </div>

          <div className="col-span-1 md:col-span-1 dark:bg-slate-900">
            <label className="text-sm text-gray-700 dark:bg-slate-900">Joining Date</label>
            <input type="date" value={generateForm.joiningDate} onChange={e => setGenerateForm({ ...generateForm, joiningDate: e.target.value })} className="w-full mt-1 p-2 border rounded" />
          </div>

          <div className="col-span-1 md:col-span-1">
            <label className="text-sm text-gray-700">&nbsp;</label>
            <div className="flex gap-2">
              <button type="submit" disabled={generating} className="px-3 py-2 bg-green-600 text-white rounded">{generating ? 'Generating...' : 'Generate Offer'}</button>
              <button type="button" onClick={() => setGenerateForm({ candidateId: '', designation: '', ctc: '', joiningDate: '', notes: '' })} className="px-3 py-2 bg-gray-200 rounded dark:bg-red-700">Reset</button>
            </div>
          </div>

          {/* <div className="col-span-1 md:col-span-5">
            <label className="text-sm text-gray-700">Notes (optional)</label>
            <input value={generateForm.notes} onChange={e => setGenerateForm({ ...generateForm, notes: e.target.value })} className="w-full mt-1 p-2 border rounded" placeholder="e.g. probation details or special notes" />
          </div> */}
        </form>
      </section>

      {/* ---------- cdate filter (ONLY addition) ---------- */}
      <section className="mb-6 bg-white p-4 rounded shadow-sm dark:bg-slate-900">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-700">Start cdate</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 p-2 border rounded" />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-700">End cdate</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full mt-1 p-2 border rounded" />
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <button onClick={() => {}} className="px-3 py-2 bg-indigo-600 text-white rounded">Apply</button>
            <button onClick={resetDates} className="px-3 py-2 bg-gray-200 rounded dark:bg-red-700">Reset</button>
            <div className="ml-auto text-sm text-gray-600">{filteredOffers.length ?? 0} / {offers.length} shown</div>
          </div>
        </div>
      </section>
      {/* ---------- end cdate filter ---------- */}

      <section>
        <div className="mb-4 flex items-center justify-between dark:bg-slate-900">
          <h2 className="text-lg font-medium dark:bg-slate-900">Generated Offers</h2>
          <div className="text-sm text-gray-600 dark:bg-slate-900">Total: {offers.length}</div>
        </div>

        {loading ? (
          <div className="p-6 bg-white rounded shadow dark:bg-slate-900">Loading...</div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700 rounded dark:bg-slate-900">{error}</div>
        ) : (
          <div className="overflow-x-auto bg-white rounded shadow dark:bg-slate-900">
            <table className="min-w-full divide-y divide-gray-200 dark:bg-slate-900">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">File</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Created</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Size (KB)</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100 dark:bg-slate-900">
                {filteredOffers.map((o) => (
                  <tr key={getIdentifier(o)}>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{o.filename || getIdentifier(o)}</div>
                      {o.url ? <div className="text-xs text-gray-500 break-all">{o.url}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-sm dark:bg-slate-900">{o.createdAt ? new Date(o.createdAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-sm dark:bg-slate-900">{o.sizeKB ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-right dark:bg-slate-900">
                      <div className="inline-flex items-center gap-2 dark:bg-slate-900">
                        <button onClick={() => openPreview(o)} className="px-2 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">Preview</button>
                        <button onClick={() => downloadOffer(o)} className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Download</button>
                        <button onClick={() => openEmailModal(o)} className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Send Email
                        </button>
                        <button onClick={() => deleteOffer(o)} className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOffers.length === 0 && <div className="p-4 text-gray-500 dark:bg-slate-900">No offers match the selected date range.</div>}
          </div>
        )}
      </section>

      {/* Preview Modal */}
      {previewOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-slate-900">
          <div className="w-[90%] md:w-3/4 lg:w-2/3 bg-white rounded shadow-lg overflow-hidden dark:bg-blue-700">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="text-lg font-medium">Preview Offer — {previewOffer.identifier}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={buildBackendOfferUrl(previewOffer.identifier, "download")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg 
        bg-emerald-600 text-white 
        hover:bg-emerald-700
        dark:bg-emerald-500 dark:hover:bg-emerald-600"
                >
                  Download
                </a>
                <button onClick={closePreview} className="px-3 py-1 bg-gray-200 rounded dark:bg-red-700">Close</button>
              </div>
            </div>
            <div className="h-[70vh]">
              <iframe src={previewOffer.previewUrl} title="Offer Preview" className="w-full h-full border-0" />
            </div>
          </div>
        </div>
      )}

      {/* Email Sending Modal */}
      {emailModalOpen && selectedOfferForEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[90%] md:w-2/3 lg:w-1/2 max-w-3xl bg-white dark:bg-slate-900 rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Send Offer Letter via Email</h3>
              </div>
              <button
                onClick={closeEmailModal}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Offer Info */}
              <div className="p-3 bg-accent/50 rounded-md">
                <p className="text-sm font-medium">Offer: {selectedOfferForEmail.filename || getIdentifier(selectedOfferForEmail)}</p>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Send To</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="emailMode"
                      value="candidates"
                      checked={emailMode === "candidates"}
                      onChange={(e) => setEmailMode(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>Selected Candidates</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="emailMode"
                      value="custom"
                      checked={emailMode === "custom"}
                      onChange={(e) => setEmailMode(e.target.value)}
                      className="w-4 h-4"
                    />
                    <span>Custom Email Addresses</span>
                  </label>
                </div>
              </div>

              {/* Candidates Selection */}
              {emailMode === "candidates" && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">Select Candidates</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllCandidates}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={clearCandidateSelection}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-slate-700 rounded hover:bg-gray-300"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Search candidates..."
                    value={emailSearch}
                    onChange={(e) => setEmailSearch(e.target.value)}
                    className="w-full mb-3 px-3 py-2 border rounded-md text-sm"
                  />

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredCandidatesForEmail.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No candidates found</p>
                    ) : (
                      filteredCandidatesForEmail.map((candidate) => {
                        const candidateId = candidate._id || candidate.id;
                        const isSelected = selectedCandidates.has(candidateId);
                        const hasEmail = candidate.email && candidate.email.includes("@");
                        
                        return (
                          <label
                            key={candidateId}
                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200"
                                : "hover:bg-accent/50"
                            } ${!hasEmail ? "opacity-50" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCandidateSelection(candidateId)}
                              disabled={!hasEmail}
                              className="w-4 h-4 rounded border-border"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium">
                                {candidate.firstName} {candidate.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {candidate.email || "No email address"}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>

                  {selectedCandidates.size > 0 && (
                    <div className="mt-3 text-sm text-muted-foreground">
                      {selectedCandidates.size} candidate(s) selected
                    </div>
                  )}
                </div>
              )}

              {/* Custom Emails */}
              {emailMode === "custom" && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">Email Addresses</label>
                    <button
                      type="button"
                      onClick={addCustomEmailField}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Email
                    </button>
                  </div>

                  <div className="space-y-2">
                    {customEmails.map((email, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="email"
                          placeholder="email@example.com"
                          value={email}
                          onChange={(e) => updateCustomEmail(index, e.target.value)}
                          className="flex-1 px-3 py-2 border rounded-md text-sm"
                        />
                        {customEmails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCustomEmail(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Subject */}
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="Email subject"
                />
              </div>

              {/* Email Message */}
              <div>
                <label className="block text-sm font-medium mb-2">Message</label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border rounded-md text-sm resize-none"
                  placeholder="Email message"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-accent/30">
              <button
                onClick={closeEmailModal}
                className="px-4 py-2 border rounded-md hover:bg-accent transition-colors"
                disabled={sendingEmail}
              >
                Cancel
              </button>
              <button
                onClick={sendOfferEmail}
                disabled={sendingEmail || (emailMode === "candidates" && selectedCandidates.size === 0) || (emailMode === "custom" && customEmails.every(e => !e.trim()))}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {sendingEmail ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
