import React, { useEffect, useRef, useState } from "react";
import axios from "../api/axios";
import { Toaster, toast } from "sonner";

export default function DocumentManager() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [forAllMode, setForAllMode] = useState(false);
  const [sendDocId, setSendDocId] = useState(null);
  const [subject, setSubject] = useState("Company Document");
  const [message, setMessage] = useState("Please find the attached document.");
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [sendStatus, setSendStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef(null);
  const dropRef = useRef(null);

  // Debug flag: set to false in production if you don't want raw response shown.
  const DEBUG_SEND = true;

  useEffect(() => {
    fetchDocs();
  }, []);

  async function fetchDocs() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/docs/list");
      setDocs(res.data || []);
    } catch (err) {
      console.error("fetchDocs error:", err);
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are allowed.");
      return;
    }
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("title", file.name);
    try {
      const res = await axios.post("/docs/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocs((p) => [res.data, ...p]);
    } catch (err) {
      console.error("upload error:", err);
      setError("Upload failed. Check server logs.");
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    uploadFile(file);
    e.target.value = "";
  }

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const onDragOver = (e) => {
      e.preventDefault();
      el.classList.add("ring-4", "ring-indigo-200");
    };
    const onDragLeave = () => el.classList.remove("ring-4", "ring-indigo-200");
    const onDrop = (e) => {
      e.preventDefault();
      el.classList.remove("ring-4", "ring-indigo-200");
      const f = e.dataTransfer.files;
      if (!f?.length) return;
      uploadFile(f[0]);
    };
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  const downloadDoc = async (doc) => {
    if (!doc?.cloudinaryUrl) return setError("No file URL found.");
    try {
      const response = await fetch(doc.cloudinaryUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename || "document.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      setError("Failed to download document");
    }
  };

  const previewDoc = (doc) => setPreviewUrl(doc.cloudinaryUrl);
  const closePreview = () => setPreviewUrl(null);

  const deleteDoc = async (id) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await axios.delete(`/docs/${id}`);
      setDocs((p) => p.filter((d) => d._id !== id));
    } catch (err) {
      console.error("delete error:", err);
      setError("Delete failed. Check server logs.");
    }
  };

  const filtered = docs.filter((d) =>
    (d.title || "").toLowerCase().includes(query.toLowerCase())
  );

  // ---------------------------
  // Robust sendDoc implementation (with extended timeout)
  // ---------------------------
  async function sendDoc(docId, recipients) {
    setSending(true);
    setError(null);
    setSendStatus(null);
    setProgress(0);
    // let user know this can take some time
    toast.loading("Sending emails... this may take a while for large recipient lists.");

    const payload = {
      docId,
      recipients,
      subject: subject || "Company Document",
      text: message || "Please find the attached document.",
    };

    console.log("[sendDoc] payload ->", payload);

    try {
      // Increase timeout to allow backend to finish batching (5 minutes)
      const res = await axios.post("/docs/send", payload, { timeout: 300000 });

      console.log("[sendDoc] raw response ->", res);

      if (!res || typeof res.status !== "number" || res.status < 200 || res.status >= 300) {
        throw new Error(`Unexpected response status ${res?.status}`);
      }

      const data = res.data || {};

      const total =
        typeof data.total === "number"
          ? data.total
          : recipients === "all"
          ? users?.length ?? 0
          : Array.isArray(recipients)
          ? recipients.length
          : 0;

      const sent =
        typeof data.sent === "number"
          ? data.sent
          : typeof data.delivered === "number"
          ? data.delivered
          : typeof data.successCount === "number"
          ? data.successCount
          : Math.max(0, total - (typeof data.failed === "number" ? data.failed : 0));

      const failed =
        typeof data.failed === "number"
          ? data.failed
          : typeof data.failedCount === "number"
          ? data.failedCount
          : Math.max(0, total - sent);

      toast.dismiss();
      toast.success("Emails sent successfully!");

      setSendStatus({
        raw: DEBUG_SEND ? data : undefined,
        total,
        sent,
        failed,
        logs: Array.isArray(data.logs) ? data.logs : [],
        sampleErrors: Array.isArray(data.sampleErrors) ? data.sampleErrors : [],
      });
    } catch (err) {
      console.error("[sendDoc] error ->", err);
      const serverData = err?.response?.data;
      console.error("[sendDoc] err.response.data ->", serverData);

      toast.dismiss();
      // If it was a timeout, give a clearer message to user
      const isTimeout = err?.code === "ECONNABORTED" || (err?.message && err.message.includes("timeout"));
      if (isTimeout) {
        toast.error("Request timed out. The server is still working — check server logs or retry later.");
      } else {
        toast.error("Sending failed!");
      }

      setSendStatus({
        raw: DEBUG_SEND ? serverData ?? { message: err.message } : undefined,
        total: serverData?.total ?? 0,
        sent: serverData?.sent ?? 0,
        failed: serverData?.failed ?? 0,
        logs: serverData?.logs ?? [`❌ Failed to send document: ${serverData?.error ?? err.message}`],
        sampleErrors: serverData?.sampleErrors ?? [{ error: serverData?.error ?? err.message }],
      });
    } finally {
      setSending(false);
      setProgress(100);
    }
  }

  // Always fetch users when opening the modal so "Send to All" uses accurate count
  async function openSendModal(docId, forAll = false) {
    try {
      setShowSendModal(true);
      setSendDocId(docId);
      setSendStatus(null);
      setForAllMode(forAll);

      // Always try to refresh users list so UI count is accurate
      try {
        const res = await axios.get("/candidates/");
        setUsers(res.data || []);
      } catch (err) {
        console.warn("Could not fetch users for modal:", err);
        // keep whatever users we had
      }

      if (forAll) setSelectedEmails([]);
    } catch (err) {
      console.error("openSendModal error:", err);
      setError("Failed to open send modal");
    }
  }

  const toggleEmail = (email) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 relative dark:bg-slate-900">
      <Toaster position="top-center" />

      {/* Progress Bar */}
      {sending && (
        <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
          <div
            className="h-1 bg-indigo-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 dark:bg-slate-900">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-gray-100">
              Company Documents
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Upload, preview, download, send and delete company PDFs.
            </p>
          </div>
          <div className="flex items-center gap-3 ">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title..."
              className="px-3 py-2 border rounded-lg bg-white shadow-sm text-sm w-64 dark:bg-slate-900"
            />
            <button
              onClick={() => fileRef.current.click()}
              disabled={uploading}
              className={`px-4 py-2 rounded-lg text-white ${
                uploading ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {uploading ? "Uploading..." : "Upload PDF"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={onFileChange}
            />
          </div>
        </header>

        {/* Drop area */}
        <div
          ref={dropRef}
          className="bg-white rounded-2xl p-6 shadow ring-1 ring-black/5 mb-6 border-2 border-dashed border-gray-200 transition"
        >
          <p className="text-sm text-gray-600 text-center">
            Drag & drop a PDF here or click “Upload PDF”
          </p>
        </div>

        {/* List */}
        {loading ? (
          <div className="bg-white p-6 rounded-2xl shadow text-center">
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl shadow text-center text-gray-500">
            No documents found.
          </div>
        ) : (
          filtered.map((doc) => (
            <div
              key={doc._id}
              className="bg-white rounded-2xl p-4  mb-5 shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 dark:bg-slate-800"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-semibold ">
                  PDF
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 ">
                    {doc.title || "Untitled"}
                  </h3>
                  <p className="text-xs text-gray-500">{doc.filename}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => previewDoc(doc)} className="px-3 py-2 border rounded-md text-sm">
                  Preview
                </button>
                <button onClick={() => downloadDoc(doc)} className="px-3 py-2 border rounded-md text-sm">
                  Download
                </button>
                <button
                  onClick={() => openSendModal(doc._id, true)}
                  className="px-3 py-2 rounded-md text-sm text-white bg-green-600 hover:bg-green-700"
                >
                  Send to All
                </button>
                <button
                  onClick={() => openSendModal(doc._id, false)}
                  className="px-3 py-2 rounded-md text-sm bg-indigo-500 text-white"
                >
                  Send to Selected
                </button>
                <button
                  onClick={() => deleteDoc(doc._id)}
                  className="px-3 py-2 rounded-md text-sm text-white bg-red-500 hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl overflow-hidden shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="text-sm text-gray-700 font-medium">Preview</div>
              <button onClick={closePreview} className="px-3 py-1 rounded-md bg-red-50 text-sm">
                Close
              </button>
            </div>
            <iframe src={previewUrl} title="pdf-preview" className="w-full h-full" />
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {forAllMode ? "Send Document to All" : "Send Document to Selected Users"}
            </h2>

            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full border rounded p-2 text-sm"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows="3"
              placeholder="Message"
              className="w-full border rounded p-2 text-sm"
            ></textarea>

            {forAllMode ? (
              <div className="text-sm text-gray-600">
                Sending to <strong>{users?.length ?? "?"}</strong> users (All).
              </div>
            ) : (
              users.length > 0 && (
                <div className="max-h-48 overflow-y-auto border rounded p-2">
                  {users.map((u) => (
                    <label key={u._id} className="flex items-center gap-2 text-sm py-1">
                      <input
                        type="checkbox"
                        checked={selectedEmails.includes(u.email)}
                        onChange={() => toggleEmail(u.email)}
                      />
                      {u.email}
                    </label>
                  ))}
                </div>
              )
            )}

            {sendStatus && (
              <div className="border rounded-lg p-3 bg-gray-50 text-sm">
                <p className="font-semibold text-gray-700">
                   Sent: {sendStatus.sent} / {sendStatus.total} — ❌ Failed: {sendStatus.failed}
                </p>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                  {sendStatus.logs?.map((log, idx) => (
                    <p key={idx} className="text-xs text-gray-600">
                      • {log}
                    </p>
                  ))}
                </div>

                {/* Debug: show raw backend response */}
                {DEBUG_SEND && sendStatus.raw && (
                  <details className="mt-3 text-xs text-gray-500">
                    <summary className="cursor-pointer text-xs text-indigo-600">Raw backend response</summary>
                    <pre className="whitespace-pre-wrap text-xs mt-2">{JSON.stringify(sendStatus.raw, null, 2)}</pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSendModal(false);
                  setSendStatus(null);
                }}
                className="px-3 py-2 text-sm border rounded-md"
                disabled={sending}
              >
                Close
              </button>

              {!sendStatus && (
                <button
                  onClick={() => sendDoc(sendDocId, forAllMode ? "all" : selectedEmails)}
                  disabled={sending || (forAllMode ? users?.length === 0 : selectedEmails.length === 0)}
                  className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-md disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send Now"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
