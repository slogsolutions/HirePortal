// src/pages/OffersAdmin.jsx
import React, { useEffect, useState, useMemo } from "react";
import api from "../api/axios";

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

  return (
    <div className="p-6 max-w-6xl mx-auto">
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
              className="w-full mt-1 p-2 border rounded"
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

          <div className="col-span-1 md:col-span-1">
            <label className="text-sm text-gray-700">Joining Date</label>
            <input type="date" value={generateForm.joiningDate} onChange={e => setGenerateForm({ ...generateForm, joiningDate: e.target.value })} className="w-full mt-1 p-2 border rounded" />
          </div>

          <div className="col-span-1 md:col-span-1">
            <label className="text-sm text-gray-700">&nbsp;</label>
            <div className="flex gap-2">
              <button type="submit" disabled={generating} className="px-3 py-2 bg-green-600 text-white rounded">{generating ? 'Generating...' : 'Generate Offer'}</button>
              <button type="button" onClick={() => setGenerateForm({ candidateId: '', designation: '', ctc: '', joiningDate: '', notes: '' })} className="px-3 py-2 bg-gray-200 rounded">Reset</button>
            </div>
          </div>

          {/* <div className="col-span-1 md:col-span-5">
            <label className="text-sm text-gray-700">Notes (optional)</label>
            <input value={generateForm.notes} onChange={e => setGenerateForm({ ...generateForm, notes: e.target.value })} className="w-full mt-1 p-2 border rounded" placeholder="e.g. probation details or special notes" />
          </div> */}
        </form>
      </section>

      {/* ---------- cdate filter (ONLY addition) ---------- */}
      <section className="mb-6 bg-white p-4 rounded shadow-sm">
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
            <button onClick={resetDates} className="px-3 py-2 bg-gray-200 rounded">Reset</button>
            <div className="ml-auto text-sm text-gray-600">{filteredOffers.length ?? 0} / {offers.length} shown</div>
          </div>
        </div>
      </section>
      {/* ---------- end cdate filter ---------- */}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Generated Offers</h2>
          <div className="text-sm text-gray-600">Total: {offers.length}</div>
        </div>

        {loading ? (
          <div className="p-6 bg-white rounded shadow">Loading...</div>
        ) : error ? (
          <div className="p-6 bg-red-50 text-red-700 rounded">{error}</div>
        ) : (
          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">File</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Created</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Size (KB)</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredOffers.map((o) => (
                  <tr key={getIdentifier(o)}>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{o.filename || getIdentifier(o)}</div>
                      {o.url ? <div className="text-xs text-gray-500 break-all">{o.url}</div> : null}
                    </td>
                    <td className="px-4 py-3 text-sm">{o.createdAt ? new Date(o.createdAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-sm">{o.sizeKB ?? '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="inline-flex items-center gap-2">
                        <button onClick={() => openPreview(o)} className="px-2 py-1 bg-indigo-600 text-white rounded text-sm">Preview</button>
                        <button onClick={() => downloadOffer(o)} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Download</button>
                        <button onClick={() => deleteOffer(o)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOffers.length === 0 && <div className="p-4 text-gray-500">No offers match the selected date range.</div>}
          </div>
        )}
      </section>

      {/* Preview Modal */}
      {previewOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[90%] md:w-3/4 lg:w-2/3 bg-white rounded shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="text-lg font-medium">Preview Offer — {previewOffer.identifier}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={buildBackendOfferUrl(previewOffer.identifier, "download")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Open in new tab
                </a>
                <button onClick={closePreview} className="px-3 py-1 bg-gray-200 rounded">Close</button>
              </div>
            </div>
            <div className="h-[70vh]">
              <iframe src={previewOffer.previewUrl} title="Offer Preview" className="w-full h-full border-0" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
