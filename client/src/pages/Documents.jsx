// import React, { useEffect, useRef, useState } from "react";
// import axios from "../api/axios";

// export default function DocumentManager() {
//   const [docs, setDocs] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [error, setError] = useState(null);
//   const [query, setQuery] = useState("");
//   const [previewUrl, setPreviewUrl] = useState(null);

//   const fileRef = useRef(null);
//   const dropRef = useRef(null);

//   useEffect(() => {
//     fetchDocs();
//   }, []);

//   // Fetch documents
//   async function fetchDocs() {
//     setLoading(true);
//     setError(null);
//     try {
//       const res = await axios.get("/docs/list");
//       setDocs(res.data || []);
//     } catch (err) {
//       console.error(err);
//       setError("Failed to load documents");
//     } finally {
//       setLoading(false);
//     }
//   }

//   // Upload file
//   async function uploadFile(file) {
//     if (!file) return;
//     if (file.type !== "application/pdf") {
//       setError("Only PDF files are allowed.");
//       return;
//     }

//     setUploading(true);
//     setError(null);
//     const form = new FormData();
//     form.append("file", file);
//     form.append("title", file.name);

//     try {
//       const res = await axios.post("/docs/upload", form, {
//         headers: { "Content-Type": "multipart/form-data" },
//       });
//       setDocs((p) => [res.data, ...p]);
//     } catch (err) {
//       console.error("upload error:", err);
//       setError("Upload failed. Check server logs.");
//     } finally {
//       setUploading(false);
//     }
//   }

//   // File input handler
//   function onFileChange(e) {
//     const file = e.target.files && e.target.files[0];
//     if (!file) return;
//     uploadFile(file);
//     e.target.value = "";
//   }

//   // Drag & drop
//   useEffect(() => {
//     const el = dropRef.current;
//     if (!el) return;

//     function onDragOver(e) {
//       e.preventDefault();
//       el.classList.add("ring-4", "ring-indigo-200");
//     }
//     function onDragLeave(e) {
//       el.classList.remove("ring-4", "ring-indigo-200");
//     }
//     function onDrop(e) {
//       e.preventDefault();
//       el.classList.remove("ring-4", "ring-indigo-200");
//       const f = e.dataTransfer.files;
//       if (!f || !f.length) return;
//       uploadFile(f[0]);
//     }

//     el.addEventListener("dragover", onDragOver);
//     el.addEventListener("dragleave", onDragLeave);
//     el.addEventListener("drop", onDrop);

//     return () => {
//       el.removeEventListener("dragover", onDragOver);
//       el.removeEventListener("dragleave", onDragLeave);
//       el.removeEventListener("drop", onDrop);
//     };
//   }, []);

//   // Download file automatically
//   const downloadDoc = (doc) => {
//     if (!doc || !doc.cloudinaryUrl) return setError("No file URL found.");
//     const link = document.createElement("a");
//     link.href = doc.cloudinaryUrl;
//     link.download = doc.filename || "file.pdf";
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   // Preview in modal
//   const previewDoc = (doc) => {
//     if (!doc || !doc.cloudinaryUrl) return setError("No file URL found.");
//     setPreviewUrl(doc.cloudinaryUrl);
//   };
//   const closePreview = () => setPreviewUrl(null);

//   // Delete document
//   const deleteDoc = async (id) => {
//     if (!window.confirm("Are you sure you want to delete this document?")) return;
//     try {
//       await axios.delete(`/docs/${id}`);
//       setDocs((p) => p.filter((d) => d._id !== id));
//     } catch (err) {
//       console.error("delete error:", err);
//       setError("Delete failed. Check server logs.");
//     }
//   };

//   // Safe filter by title
//   const filtered = docs.filter((d) =>
//     (d.title || "").toLowerCase().includes(query.toLowerCase())
//   );

//   return (
//     <div className="min-h-screen bg-gray-50 p-6">
//       <div className="max-w-6xl mx-auto">
//         <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
//           <div>
//             <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
//               Company's Documents
//             </h1>
//             <p className="mt-1 text-sm text-gray-500">
//               Upload, preview, and download company PDFs (rules, policies).
//             </p>
//           </div>

//           <div className="flex items-center gap-3">
//             <input
//               value={query}
//               onChange={(e) => setQuery(e.target.value)}
//               placeholder="Search by title..."
//               className="px-3 py-2 border rounded-lg bg-white shadow-sm text-sm w-64"
//             />

//             <div className="flex items-center gap-2">
//               <button
//                 onClick={() => fileRef.current.click()}
//                 disabled={uploading}
//                 className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow text-white ${
//                   uploading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
//                 }`}
//               >
//                 {uploading && (
//                   <svg
//                     className="animate-spin h-4 w-4 mr-2 text-white"
//                     xmlns="http://www.w3.org/2000/svg"
//                     fill="none"
//                     viewBox="0 0 24 24"
//                   >
//                     <circle
//                       className="opacity-25"
//                       cx="12"
//                       cy="12"
//                       r="10"
//                       stroke="currentColor"
//                       strokeWidth="4"
//                     ></circle>
//                     <path
//                       className="opacity-75"
//                       fill="currentColor"
//                       d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 018 8h-4l3 3-3 3h-4z"
//                     ></path>
//                   </svg>
//                 )}
//                 {uploading ? "Uploading..." : "Upload PDF"}
//               </button>
//               <input
//                 ref={fileRef}
//                 type="file"
//                 accept="application/pdf"
//                 className="hidden"
//                 onChange={onFileChange}
//               />
//             </div>
//           </div>
//         </header>

//         {/* Upload card with drag/drop */}
//         <div
//           ref={dropRef}
//           className="bg-white rounded-2xl p-6 shadow ring-1 ring-black/5 mb-6 border-2 border-dashed border-gray-200 transition"
//         >
//           <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//             <div>
//               <h3 className="text-sm font-medium text-gray-900">Drag & drop</h3>
//               <p className="text-xs text-gray-500 mt-1">
//                 Drop a PDF here or click <span className="font-medium">Upload PDF</span>.
//               </p>
//             </div>

//             <div className="text-sm text-gray-600">
//               <div>
//                 Total files: <span className="font-medium text-gray-900">{docs.length}</span>
//               </div>
//             </div>
//           </div>
//         </div>

//         {error && <div className="mb-4 text-red-600 font-medium">{String(error)}</div>}

//         {/* List */}
//         <main className="grid grid-cols-1 gap-4">
//           {loading ? (
//             <div className="bg-white p-6 rounded-2xl shadow text-center">Loading...</div>
//           ) : filtered.length === 0 ? (
//             <div className="bg-white p-6 rounded-2xl shadow text-center text-gray-500">
//               No documents found. Upload a PDF to get started.
//             </div>
//           ) : (
//             filtered.map((doc) => (
//               <div
//                 key={doc._id}
//                 className="bg-white rounded-2xl p-4 shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
//               >
//                 <div className="flex items-start gap-4">
//                   <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-semibold">
//                     PDF
//                   </div>
//                   <div>
//                     <div className="flex items-center gap-2">
//                       <h3 className="text-sm font-medium text-gray-900">{doc.title || "Untitled"}</h3>
//                       <span className="text-xs text-gray-400">•</span>
//                       <span className="text-xs text-gray-500">{new Date(doc.createdAt).toLocaleString()}</span>
//                     </div>
//                     <p className="mt-1 text-xs text-gray-500 max-w-xl">{doc.filename || ""}</p>
//                   </div>
//                 </div>

//                 <div className="flex items-center gap-2">
//                   <button onClick={() => previewDoc(doc)} className="px-3 py-2 border rounded-md text-sm">
//                     Preview
//                   </button>
//                   <button onClick={() => downloadDoc(doc)} className="px-3 py-2 border rounded-md text-sm">
//                     Download
//                   </button>
//                   <button
//                     onClick={() => deleteDoc(doc._id)}
//                     className="px-3 py-2 bg-red-500 text-white rounded-md text-sm hover:bg-red-600"
//                   >
//                     Delete
//                   </button>
//                 </div>
//               </div>
//             ))
//           )}
//         </main>
//       </div>

//       {/* Preview Modal */}
//       {previewUrl && (
//         <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
//           <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl overflow-hidden shadow-lg flex flex-col">
//             <div className="flex items-center justify-between p-3 border-b">
//               <div className="text-sm text-gray-700 font-medium">Preview</div>
//               <div className="flex items-center gap-2">
//                 <a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs px-3 py-1 border rounded-md">Open in new tab</a>
//                 <button onClick={closePreview} className="px-3 py-1 rounded-md bg-red-50 text-sm">Close</button>
//               </div>
//             </div>
//             <div className="flex-1 bg-gray-100">
//               <iframe src={previewUrl} title="pdf-preview" className="w-full h-full" />
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
// --------------OLD ---------------------------------------------WORKING------------------

import React, { useEffect, useRef, useState } from "react";
import axios from "../api/axios";

export default function DocumentManager() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null); // Track which doc is being deleted
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);

  const fileRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  // Fetch documents
  async function fetchDocs() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get("/docs/list");
      setDocs(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  // Upload file
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

  // File input handler
  function onFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    uploadFile(file);
    e.target.value = "";
  }

  // Drag & drop
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;

    function onDragOver(e) {
      e.preventDefault();
      el.classList.add("ring-4", "ring-indigo-200");
    }
    function onDragLeave(e) {
      el.classList.remove("ring-4", "ring-indigo-200");
    }
    function onDrop(e) {
      e.preventDefault();
      el.classList.remove("ring-4", "ring-indigo-200");
      const f = e.dataTransfer.files;
      if (!f || !f.length) return;
      uploadFile(f[0]);
    }

    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);

    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  // Download file automatically
  const downloadDoc = async (doc) => {
    if (!doc || !doc.cloudinaryUrl) return setError("No file URL found.");
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

  // Preview in modal
  const previewDoc = (doc) => {
    if (!doc || !doc.cloudinaryUrl) return setError("No file URL found.");
    setPreviewUrl(doc.cloudinaryUrl);
  };
  const closePreview = () => setPreviewUrl(null);

  // Delete document
  const deleteDoc = async (id) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;

    try {
      setDeletingId(id); // Start spinner for this doc
      await axios.delete(`/docs/${id}`);
      setDocs((p) => p.filter((d) => d._id !== id));
    } catch (err) {
      console.error("delete error:", err);
      setError("Delete failed. Check server logs.");
    } finally {
      setDeletingId(null); // Stop spinner
    }
  };

  // Filter documents by query
  const filtered = docs.filter((d) =>
    (d.title || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
              Company's Documents
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Upload, preview, download, and delete company PDFs (rules, policies).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title..."
              className="px-3 py-2 border rounded-lg bg-white shadow-sm text-sm w-64"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => fileRef.current.click()}
                disabled={uploading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow text-white ${
                  uploading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {uploading && (
                  <svg
                    className="animate-spin h-4 w-4 mr-2 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 018 8h-4l3 3-3 3h-4z"
                    ></path>
                  </svg>
                )}
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
          </div>
        </header>

        {/* Upload card with drag/drop */}
        <div
          ref={dropRef}
          className="bg-white rounded-2xl p-6 shadow ring-1 ring-black/5 mb-6 border-2 border-dashed border-gray-200 transition"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Drag & drop</h3>
              <p className="text-xs text-gray-500 mt-1">
                Drop a PDF here or click <span className="font-medium">Upload PDF</span>.
              </p>
            </div>

            <div className="text-sm text-gray-600">
              <div>Total files: <span className="font-medium text-gray-900">{docs.length}</span></div>
            </div>
          </div>
        </div>

        {error && <div className="mb-4 text-red-600 font-medium">{String(error)}</div>}

        {/* List */}
        <main className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="bg-white p-6 rounded-2xl shadow text-center">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl shadow text-center text-gray-500">
              No documents found. Upload a PDF to get started.
            </div>
          ) : (
            filtered.map((doc) => (
              <div
                key={doc._id}
                className="bg-white rounded-2xl p-4 shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-semibold">
                    PDF
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-gray-900">{doc.title || "Untitled"}</h3>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{new Date(doc.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 max-w-xl">{doc.filename || ""}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => previewDoc(doc)} className="px-3 py-2 border rounded-md text-sm">Preview</button>
                  <button onClick={() => downloadDoc(doc)} className="px-3 py-2 border rounded-md text-sm">Download</button>
                  <button
                    onClick={() => deleteDoc(doc._id)}
                    disabled={deletingId === doc._id}
                    className={`px-3 py-2 rounded-md text-sm text-white ${
                      deletingId === doc._id ? "bg-gray-400 cursor-not-allowed" : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    {deletingId === doc._id ? (
                      <svg className="animate-spin h-4 w-4 mx-auto text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 018 8h-4l3 3-3 3h-4z"></path>
                      </svg>
                    ) : "Delete"}
                  </button>
                </div>
              </div>
            ))
          )}
        </main>
      </div>

      {/* Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl overflow-hidden shadow-lg flex flex-col">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="text-sm text-gray-700 font-medium">Preview</div>
              <div className="flex items-center gap-2">
                <a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs px-3 py-1 border rounded-md">Open in new tab</a>
                <button onClick={closePreview} className="px-3 py-1 rounded-md bg-red-50 text-sm">Close</button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100">
              <iframe src={previewUrl} title="pdf-preview" className="w-full h-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
