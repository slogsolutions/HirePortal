import React, { useEffect, useState } from "react";
import api from "../api/axios"; // import your axios instance

export default function OffersAdmin() {
  const [offers, setOffers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [error, setError] = useState(null);

  const [previewOfferId, setPreviewOfferId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [generating, setGenerating] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    candidateId: "",
    designation: "",
    ctc: "",
    joiningDate: "",
    notes: ""
  });

  // Fetch offers
  const fetchOffers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/offers");
      const rawOffers = data.offers || data;
      const normalized = rawOffers.map((item) => ({
        id: item.offerId || item._id || item.filename,
        filename: item.filename || null,
        url: item.offerLetterUrl || item.url || null,
        sizeKB: item.sizeKB || null,
        createdAt: item.createdAt || null,
        candidateName: item.candidateName || null,
        designation: item.designation || null,
        ctc: item.ctc || null,
        joiningDate: item.joiningDate || null,
        status: item.status || null
      }));
      setOffers(normalized);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch offers");
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch candidates
  const fetchCandidates = async () => {
    setCandidatesLoading(true);
    try {
      const { data } = await api.get("/candidates");
      setCandidates(Array.isArray(data) ? data : data.candidates || []);
    } catch (err) {
      console.error(err);
      setCandidates([]);
    } finally {
      setCandidatesLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchOffers();
  }, []);

  const openPreview = (offerId) => {
    const url = `/offers/${encodeURIComponent(offerId)}/preview`;
    setPreviewOfferId(offerId);
    setPreviewUrl(url);
  };

  const closePreview = () => {
    setPreviewOfferId(null);
    setPreviewUrl("");
  };

  const downloadOffer = (offerId) => {
    const url = `/offers/${encodeURIComponent(offerId)}/download`;
    window.open(url, "_blank");
  };

  const deleteOffer = async (offerId) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    try {
      await api.delete(`/offers/${encodeURIComponent(offerId)}`);
      alert("Offer deleted");
      fetchOffers();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to delete offer");
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    const { candidateId, designation, ctc, joiningDate, notes } = generateForm;
    if (!candidateId) return alert("Please select a candidate");
    setGenerating(true);
    try {
      await api.post(`/candidates/${encodeURIComponent(candidateId)}/offer/generate`, {
        designation,
        ctc,
        joiningDate,
        notes
      });
      alert("Offer generated");
      fetchOffers();
      setGenerateForm({ candidateId: "", designation: "", ctc: "", joiningDate: "", notes: "" });
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to generate offer");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Offers Admin — Slog Solutions</h1>
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
                <option key={c._id} value={c._id}>
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

          <div className="col-span-1 md:col-span-5">
            <label className="text-sm text-gray-700">Notes (optional)</label>
            <input value={generateForm.notes} onChange={e => setGenerateForm({ ...generateForm, notes: e.target.value })} className="w-full mt-1 p-2 border rounded" placeholder="e.g. probation details or special notes" />
          </div>
        </form>
      </section>

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
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">File / Candidate</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Designation</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">CTC</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Created</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Size (KB)</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {offers.map((o) => (
                  <tr key={o.id}>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{o.candidateName || o.filename || o.id}</div>
                      {o.url && <div className="text-xs text-gray-500 break-all">{o.url}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm">{o.designation || '-'}</td>
                    <td className="px-4 py-3 text-sm">{o.ctc || '-'}</td>
                    <td className="px-4 py-3 text-sm">{o.createdAt ? new Date(o.createdAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3 text-sm">{o.sizeKB || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      <div className="inline-flex items-center gap-2">
                        <button onClick={()=>openPreview(o.id)} className="px-2 py-1 bg-indigo-600 text-white rounded text-sm">Preview</button>
                        <button onClick={()=>downloadOffer(o.id)} className="px-2 py-1 bg-blue-600 text-white rounded text-sm">Download</button>
                        <button onClick={()=>deleteOffer(o.id)} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {offers.length === 0 && <div className="p-4 text-gray-500">No offers generated yet.</div>}
          </div>
        )}
      </section>

      {/* Preview Modal */}
      {previewOfferId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[90%] md:w-3/4 lg:w-2/3 bg-white rounded shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="text-lg font-medium">Preview Offer — {previewOfferId}</h3>
              <div className="flex items-center gap-2">
                <a href={`${API_BASE}/api/offers/${encodeURIComponent(previewOfferId)}/download`} target="_blank" rel="noreferrer" className="px-3 py-1 bg-blue-600 text-white rounded">Open in new tab</a>
                <button onClick={closePreview} className="px-3 py-1 bg-gray-200 rounded">Close</button>
              </div>
            </div>
            <div className="h-[70vh]">
              <iframe src={previewUrl} title="Offer Preview" className="w-full h-full border-0" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
