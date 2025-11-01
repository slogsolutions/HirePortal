// import React, { useEffect, useState, useRef, useCallback } from "react"; 
// import { useParams, useNavigate } from "react-router-dom";
// import { PencilIcon } from "@heroicons/react/24/outline";
// import api from "../api/axios";
// import Modal from "../components/Modal";

// const STATUS_ORDER = [
//   "applied",
//   "verifying",
//   "interviewing",
//   "offered",
//   "accepted",
//   "rejected",
// ];
// const prettyStatus = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "-");

// export default function CandidateProfilePage() {
//   const { id } = useParams();
//   const navigate = useNavigate();

//   const [candidate, setCandidate] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [docs, setDocs] = useState([]);
//   const [previewDoc, setPreviewDoc] = useState(null);
//   const [verifying, setVerifying] = useState(false);
//   const [editModalOpen, setEditModalOpen] = useState(false);

//   // photo modal state
//   const [photoModalOpen, setPhotoModalOpen] = useState(false);

//   // derived id used for API calls (candidate._id may not exist immediately)
//   const candidateId = candidate?._id || id;

//   useEffect(() => {
//     if (!id) return;
//     let mounted = true;
//     (async () => {
//       setLoading(true);
//       try {
//         const res = await api.get(`/candidates/${id}`);
//         if (!mounted) return;
//         setCandidate(res.data);
//       } catch (err) {
//         console.error(err);
//         alert(err?.response?.data?.message || "Failed to load candidate");
//       } finally {
//         if (mounted) setLoading(false);
//       }
//     })();
//     return () => (mounted = false);
//   }, [id]);

//   useEffect(() => {
//     if (!id) return;
//     let mounted = true;
//     (async () => {
//       try {
//         const res = await api.get(`/candidates/${id}/documents`);
//         if (!mounted) return;
//         setDocs(Array.isArray(res.data) ? res.data : []);
//       } catch (err) {
//         console.error(err);
//         setDocs([]);
//       }
//     })();
//     return () => (mounted = false);
//   }, [id]);

//   if (loading) return <div className="p-8 text-center">Loading candidate...</div>;
//   if (!candidate)
//     return (
//       <div className="p-8 text-center text-gray-500">Candidate not found</div>
//     );

//   const currentIdx = Math.max(0, STATUS_ORDER.indexOf(candidate.status || "applied"));

//   const updateStatus = async (newStatus) => {
//     if (!newStatus || candidate.status === newStatus) return;
//     const prev = candidate.status;
//     setCandidate((c) => ({ ...c, status: newStatus }));
//     try {
//       await api.put(`/candidates/${candidateId}`, { status: newStatus });
//     } catch (err) {
//       console.error(err);
//       alert(err?.response?.data?.message || "Failed to update status");
//       setCandidate((c) => ({ ...c, status: prev }));
//     }
//   };

//   const handleVerifyMobile = async () => {
//     if (candidate.mobileVerified) return alert("Mobile already verified");
//     setVerifying(true);
//     const prev = { ...candidate };
//     setCandidate((c) => ({ ...c, mobileVerified: true }));
//     try {
//       const payload = { mobileVerified: true };
//       if ((candidate.status || "applied") === "applied") payload.status = "verifying";
//       await api.put(`/candidates/${candidateId}`, payload);
//     } catch (err) {
//       console.error(err);
//       alert(err?.response?.data?.message || "Verify failed");
//       setCandidate(prev);
//     } finally {
//       setVerifying(false);
//     }
//   };

//   const createdAt = candidate.createdAt ? new Date(candidate.createdAt).toLocaleString() : "-";

//   // Helpers to render value or '-' and to format date
//   const show = (val) => (val === null || val === undefined || val === "" ? "-" : val);
//   const showDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "-");

//   // Photo upload utilities: passed to PhotoModal
//   const refreshCandidate = async () => {
//     try {
//       const res = await api.get(`/candidates/${candidateId}`);
//       setCandidate(res.data);
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   return (
//     <div className="max-w-6xl mx-auto py-8">
//       {/* Header & Status Controls */}
//       <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-6 gap-4">
//         <div className="flex items-start gap-4">
//           {/* Avatar with overlay pencil */}
//           <div className="relative">
//             <button
//               onClick={() => setPhotoModalOpen(true)}
//               className="w-20 h-20 rounded-full overflow-hidden border bg-gray-100 flex items-center justify-center focus:outline-none"
//               title="View / change photo"
//             >
//               {candidate.photoUrl ? (
//                 <img src={candidate.photoUrl} alt="avatar" className="w-full h-full object-cover" />
//               ) : (
//                 <div className="text-gray-500 font-semibold text-lg">
//                   {(candidate.firstName?.[0] || candidate.lastName?.[0] || "?").toUpperCase()}
//                 </div>
//               )}
//             </button>

//             {/* small pencil icon overlay */}
//             <button
//               onClick={() => setPhotoModalOpen(true)}
//               className="absolute right-0 bottom-0 -translate-y-1/4 -translate-x-1/4 bg-white rounded-full p-1 shadow border"
//               aria-label="Edit photo"
//             >
//               <PencilIcon className="w-4 h-4 text-gray-700" />
//             </button>
//           </div>

//           <div>
//             <button onClick={() => navigate("/candidates")} className="text-sm text-indigo-600 hover:underline">
//               &larr; Back
//             </button>
//             <h1 className="text-2xl font-semibold mt-2">
//               {show(candidate.firstName)} {candidate.lastName ? show(candidate.lastName) : ""}
//             </h1>
//             <div className="text-sm text-gray-500 mt-1">
//               {show(candidate.email)} • {show(candidate.mobile)}
//             </div>
//             <div className="text-xs text-gray-400 mt-1">Created: {createdAt}</div>
//           </div>
//         </div>

//         <div className="flex gap-2 flex-wrap">
//           <button className="px-3 py-1 rounded bg-green-500 text-white-800 border border-green-200" onClick={() => navigate(`/idcard/${candidateId}`)}>
//             Candidate Card
//           </button>

//           <button
//             onClick={handleVerifyMobile}
//             disabled={verifying || candidate.mobileVerified}
//             className={`px-3 py-1 rounded ${candidate.mobileVerified ? "bg-green-100 text-green-800 border border-green-200" : "bg-indigo-600 text-white"}`}
//           >
//             {candidate.mobileVerified ? "Mobile Verified" : verifying ? "Verifying..." : "Verify Mobile"}
//           </button>

//           <select value={candidate.status || "applied"} onChange={(e) => updateStatus(e.target.value)} className="px-2 py-1 border rounded">
//             {STATUS_ORDER.map((s) => (
//               <option key={s} value={s}>
//                 {prettyStatus(s)}
//               </option>
//             ))}
//           </select>
//         </div>
//       </div>

//       {/* Timeline & Details */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         {/* Timeline */}
//         <div className="col-span-1 bg-white rounded-xl shadow p-4">
//           <div className="text-sm font-semibold mb-3">Timeline</div>
//           <div className="space-y-4">
//             {STATUS_ORDER.map((step, idx) => {
//               const completed = idx < currentIdx;
//               const active = idx === currentIdx;
//               return (
//                 <div key={step} className="flex items-start gap-3">
//                   <div className="flex flex-col items-center">
//                     <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${completed ? "bg-green-600" : active ? "bg-indigo-600" : "bg-gray-300"}`}>
//                       {completed ? "✓" : idx + 1}
//                     </div>
//                     {idx !== STATUS_ORDER.length - 1 && (
//                       <div className={`w-px flex-1 ${idx < currentIdx ? "bg-green-200" : "bg-gray-200"}`} style={{ height: 28 }} />
//                     )}
//                   </div>
//                   <div className="flex-1">
//                     <div className={`font-medium ${active ? "text-indigo-700" : completed ? "text-gray-700" : "text-gray-500"}`}>
//                       {prettyStatus(step)}
//                     </div>
//                     {active && !completed && (
//                       <button
//                         onClick={() => {
//                           // route to task pages for steps that require action
//                           switch (step) {
//                             case "applied":
//                               // applied: just advance status locally/server-side
//                               updateStatus("verifying"); // or leave as-is if you want applied -> verifying automatically
//                               break;
//                             case "verifying":
//                               navigate(`/candidates/${candidateId}/verify`);
//                               break;
//                             case "interviewing":
//                               navigate(`/candidates/${candidateId}/interview`);
//                               break;
//                             case "offered":
//                               navigate(`/candidates/${candidateId}/offer`);
//                               break;
//                             default:
//                               // fallback: just advance to next
//                               updateStatus(STATUS_ORDER[Math.min(currentIdx + 1, STATUS_ORDER.length - 1)]);
//                           }
//                         }}
//                         className="mt-1 px-3 py-1 bg-indigo-600 text-white rounded text-xs"
//                       >
//                         Mark Complete
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//         {/* Candidate Details */}
//         <div className="col-span-2 bg-white rounded-xl shadow p-6 space-y-4">
//           <div className="flex justify-between items-center">
//             <h2 className="text-lg font-semibold">Candidate Details</h2>
//             <button onClick={() => setEditModalOpen(true)} className="text-indigo-600 hover:text-indigo-800">
//               <PencilIcon className="w-5 h-5 inline" />
//             </button>
//           </div>

//           {/* Personal Info */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <div className="text-xs text-gray-500">Full Name</div>
//               <div>{(candidate.firstName || "") + (candidate.lastName ? " " + candidate.lastName : "") || "-"}</div>
//             </div>

//             <div>
//               <div className="text-xs text-gray-500">Email</div>
//               <div>{show(candidate.email)}</div>
//             </div>

//             <div>
//               <div className="text-xs text-gray-500">Mobile</div>
//               <div>{show(candidate.mobile)}</div>
//             </div>

//             <div>
//               <div className="text-xs text-gray-500">Alternative Mobile</div>
//               <div>{show(candidate.AlternativeMobile)}</div>
//             </div>

//             <div>
//               <div className="text-xs text-gray-500">DOB</div>
//               <div>{candidate.dob ? showDate(candidate.dob) : "-"}</div>
//             </div>

//             <div>
//               <div className="text-xs text-gray-500">Gender</div>
//               <div>{show(candidate.Gender)}</div>
//             </div>

//             <div>
//               <div className="text-xs text-gray-500">Blood Group</div>
//               <div>{show(candidate.BloodGroup)}</div>
//             </div>

//             <div>
//               <div className="text-xs text-gray-500">Department</div>
//               <div>{show(candidate.department)}</div>
//             </div>
//           </div>

//           {/* Parents & Contact */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <div className="text-xs text-gray-500">Father</div>
//               <div>{show(candidate.fatherName)}</div>
//             </div>
//             <div>
//               <div className="text-xs text-gray-500">Father Mobile</div>
//               <div>{show(candidate.fatherMobile)}</div>
//             </div>
//             <div>
//               <div className="text-xs text-gray-500">Mother</div>
//               <div>{show(candidate.MotherName)}</div>
//             </div>
//             <div>
//               <div className="text-xs text-gray-500">Mobile Verified</div>
//               <div>{candidate.mobileVerified ? "Yes" : "No"}</div>
//             </div>
//           </div>

//           {/* Marital */}
//           <div>
//             <div className="text-xs text-gray-500">Marital Status</div>
//             {candidate.isMarried ? (
//               <div className="space-y-1">
//                 <div>Married</div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
//                   <div>
//                     <div className="text-xs text-gray-500">Spouse Name</div>
//                     <div>{show(candidate.spouseName)}</div>
//                   </div>
//                   <div>
//                     <div className="text-xs text-gray-500">Spouse Number</div>
//                     <div>{show(candidate.spouseNumber)}</div>
//                   </div>
//                 </div>
//               </div>
//             ) : (
//               <div>Not married</div>
//             )}
//           </div>

//           {/* Addresses */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <div className="text-xs text-gray-500 mb-1">Current Address</div>
//               <div>{show(candidate.address?.current?.line1)}</div>
//               <div>{show(candidate.address?.current?.line2)}</div>
//               <div>
//                 {show(candidate.address?.current?.city)}, {show(candidate.address?.current?.state)} {show(candidate.address?.current?.pincode)}
//               </div>
//             </div>

//             <div>
//               <div className="text-xs text-gray-500 mb-1">Permanent Address</div>
//               <div>{show(candidate.address?.permanent?.line1)}</div>
//               <div>{show(candidate.address?.permanent?.line2)}</div>
//               <div>
//                 {show(candidate.address?.permanent?.city)}, {show(candidate.address?.permanent?.state)} {show(candidate.address?.permanent?.pincode)}
//               </div>

//               <div className="text-xs text-gray-400 mt-2">
//                 {candidate.address?.isPermanentSameAsCurrent ? "Permanent same as current" : ""}
//               </div>
//             </div>
//           </div>

//           {/* PG Info (only if isPG true) */}
//           {candidate.address?.isPG && (
//             <div className="bg-gray-50 border rounded p-3">
//               <div className="text-xs text-gray-500">Living Arrangement</div>
//               <div className="mt-1">Living in PG / Rent</div>

//               <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
//                 <div>
//                   <div className="text-xs text-gray-500">PG Owner</div>
//                   <div>{show(candidate.address?.pgOwnerName)}</div>
//                 </div>
//                 <div>
//                   <div className="text-xs text-gray-500">PG Name</div>
//                   <div>{show(candidate.address?.pgName)}</div>
//                 </div>
//                 <div>
//                   <div className="text-xs text-gray-500">PG Number</div>
//                   <div>{show(candidate.address?.pgNumber)}</div>
//                 </div>
//               </div>
//             </div>
//           )}

//           {/* Job Info */}
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div>
//               <div className="text-xs text-gray-500">Company</div>
//               <div>SLOG</div>
//             </div>
//             <div>
//               <div className="text-xs text-gray-500">Designation</div>
//               <div>{show(candidate.Designation)}</div>
//             </div>
//             <div>
//               <div className="text-xs text-gray-500">Salary</div>
//               <div>{show(candidate.Salary)}</div>
//             </div>

//             <div>
//               <div className="text-xs text-gray-500">Date of Joining</div>
//               <div>{candidate.DateOfJoining ? showDate(candidate.DateOfJoining) : "-"}</div>
//             </div>
//             <div>
//               <div className="text-xs text-gray-500">Next Increment</div>
//               <div>{show(candidate.NextIncreament)}</div>
//             </div>
//             <div>
//               <div className="text-xs text-gray-500">Next Increment Date</div>
//               <div>{candidate.NextIncreamentDate ? showDate(candidate.NextIncreamentDate) : "-"}</div>
//             </div>
//           </div>

//           {/* IDs & Policies */}
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div>
//               <div className="text-xs text-gray-500">Aadhaar</div>
//               <div>{show(candidate.aadhaarNumber)}</div>
//             </div>
//             <div>
//               <div className="text-xs text-gray-500">PAN</div>
//               <div>{show(candidate.panNumber)}</div>
//             </div>
//             <div>
//               <div className="text-xs text-gray-500">Driving License</div>
//               <div>{show(candidate.drivingLicenseNumber)}</div>
//             </div>

//             <div>
//               <div className="text-xs text-gray-500">PF Number</div>
//               <div>{show(candidate.pfNumber)}</div>
//             </div>
//             <div>
//               <div className="text-xs text-gray-500">ESIC Number</div>
//               <div>{show(candidate.esicNumber)}</div>
//             </div>
//             <div>
//               <div className="text-xs text-gray-500">Medical Policy</div>
//               <div>{show(candidate.medicalPolicyNumber)}</div>
//             </div>
//           </div>

//           {/* Documents */}
//           <div>
//             <div className="flex items-center justify-between font-semibold text-sm mb-2">
//               Documents <span className="text-gray-500 text-xs">{docs.length} files</span>
//             </div>
//             {docs.length === 0 ? (
//               <div className="text-sm text-gray-500">No documents uploaded</div>
//             ) : (
//               docs.map((d) => (
//                 <div key={d._id || d.id} className="flex items-center justify-between gap-2 mb-1">
//                   <div className="font-medium text-sm">{d.filename || d.name}</div>
//                   <div className="flex gap-2">
//                     <a href={d.url || `/uploads/${d.filename}`} target="_blank" rel="noreferrer" className="text-indigo-600 underline text-sm">
//                       Open
//                     </a>
//                     <button onClick={() => setPreviewDoc(d)} className="px-2 py-1 text-sm border rounded">
//                       Preview
//                     </button>
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Edit Modal */}
//       <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Candidate">
//         <EditableCandidateForm
//           candidate={candidate}
//           setCandidate={(updated) => {
//             // update parent immediately
//             setCandidate(updated);
//           }}
//         />
//       </Modal>

//       {/* Photo Modal */}
//       <Modal isOpen={photoModalOpen} onClose={() => setPhotoModalOpen(false)} title="Profile Photo">
//         <PhotoModalContent candidate={candidate} onClose={() => setPhotoModalOpen(false)} onUploaded={refreshCandidate} />
//       </Modal>

//       {/* Document Preview Modal */}
//       <Modal isOpen={!!previewDoc} onClose={() => setPreviewDoc(null)} title={previewDoc?.filename || "Preview"}>
//         {previewDoc?.contentType?.startsWith("image/") ? (
//           <img src={previewDoc.url} alt={previewDoc.filename} className="w-full h-auto" />
//         ) : (
//           <a href={previewDoc?.url} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
//             {previewDoc?.filename || "Open document"}
//           </a>
//         )}
//       </Modal>
//     </div>
//   );
// }

// // Photo modal content component
// function PhotoModalContent({ candidate, onClose, onUploaded }) {
//   const [file, setFile] = useState(null);
//   const [preview, setPreview] = useState(candidate.photoUrl || null);
//   const [uploading, setUploading] = useState(false);
//   const inputRef = useRef();

//   useEffect(() => {
//     setPreview(candidate.photoUrl || null);
//     setFile(null);
//   }, [candidate]);

//   useEffect(() => {
//     let url;
//     if (file) {
//       url = URL.createObjectURL(file);
//       setPreview(url);
//     }
//     return () => {
//       if (url) URL.revokeObjectURL(url);
//     };
//   }, [file]);

//   const onFileChange = (e) => {
//     const f = e.target.files?.[0];
//     if (f) setFile(f);
//   };

//   const upload = async () => {
//     if (!file) return alert("Select a file first");
//     setUploading(true);
//     try {
//       const fd = new FormData();
//       fd.append("photo", file);
//       // prefer candidate._id but fall back to route id
//       const id = candidate._id || candidate.id;
//       await api.post(`/candidates/${id}/photo`, fd, { headers: { "Content-Type": "multipart/form-data" } });
//       if (onUploaded) await onUploaded();
//       alert("Uploaded");
//       onClose();
//     } catch (err) {
//       console.error(err);
//       alert(err?.response?.data?.message || "Upload failed");
//     } finally {
//       setUploading(false);
//     }
//   };

//   const resetImage = async () => {
//     if (!window.confirm("Reset profile photo to empty?")) return;
//     try {
//       const id = candidate._id || candidate.id;
//       await api.put(`/candidates/${id}`, { photoUrl: "" });
//       if (onUploaded) await onUploaded();
//       alert("Reset");
//     } catch (err) {
//       console.error(err);
//       alert(err?.response?.data?.message || "Reset failed");
//     }
//   };

//   return (
//     <div className="space-y-4">
//       <div className="flex items-center justify-center">
//         {preview ? (
//           <img src={preview} alt="preview" className="max-w-full max-h-[50vh] rounded-md object-contain" />
//         ) : (
//           <div className="w-48 h-48 rounded-full bg-gray-100 flex items-center justify-center">No image</div>
//         )}
//       </div>

//       <div className="flex items-center gap-2">
//         <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
//         <button type="button" onClick={() => inputRef.current?.click()} className="px-3 py-2 border rounded bg-white">
//           Choose
//         </button>
//         <button type="button" onClick={upload} disabled={uploading} className="px-3 py-2 bg-indigo-600 text-white rounded">
//           {uploading ? "Uploading..." : "Upload"}
//         </button>
//         <button type="button" onClick={resetImage} className="px-3 py-2 border rounded text-sm">
//           Reset Image
//         </button>
//         <button type="button" onClick={onClose} className="px-3 py-2 border rounded text-sm">
//           Close
//         </button>
//       </div>
//     </div>
//   );
// }

// // ================= Editable Candidate Form =================
// // Uncontrolled inputs + inputsRef to avoid re-renders while typing
// const EditableCandidateForm = React.memo(function EditableCandidateForm({ candidate, setCandidate }) {
//   // compute initial values from candidate (only used to set defaultValue)
//   const computeInit = (cand) => ({
//     firstName: cand.firstName || "",
//     lastName: cand.lastName || "",
//     email: cand.email || "",
//     mobile: cand.mobile || "",
//     AlternativeMobile: cand.AlternativeMobile || "",
//     fatherName: cand.fatherName || "",
//     MotherName: cand.MotherName || "",
//     dob: cand.dob?.slice(0, 10) || "",
//     Gender: cand.Gender || "",
//     BloodGroup: cand.BloodGroup || "",
//     Designation: cand.Designation || "",
//     Salary: cand.Salary || "",
//     DateOfJoining: cand.DateOfJoining?.slice(0, 10) || "",
//     NextIncreament: cand.NextIncreament || "",
//     NextIncreamentDate: cand.NextIncreamentDate?.slice(0, 10) || "",
//     address: {
//       current: { ...(cand.address?.current || {}) },
//       permanent: { ...(cand.address?.permanent || {}) },
//       isPermanentSameAsCurrent: !!cand.address?.isPermanentSameAsCurrent,
//       isPG: !!cand.address?.isPG,
//       pgOwnerName: cand.address?.pgOwnerName || "",
//       pgName: cand.address?.pgName || "",
//       pgNumber: cand.address?.pgNumber || "",
//     },
//     aadhaarNumber: cand.aadhaarNumber || "",
//     panNumber: cand.panNumber || "",
//     drivingLicenseNumber: cand.drivingLicenseNumber || "",
//     pfNumber: cand.pfNumber || "",
//     esicNumber: cand.esicNumber || "",
//     medicalPolicyNumber: cand.medicalPolicyNumber || "",
//     isMarried: !!cand.isMarried,
//     spouseName: cand.spouseName || "",
//     spouseNumber: cand.spouseNumber || "",
//   });

//   const init = computeInit(candidate);

//   // refs for inputs: store latest typed values here without causing re-renders
//   const inputsRef = useRef({
//     // shallow copy initial values (strings / primitives)
//     ...init,
//     address: {
//       current: { ...(init.address.current || {}) },
//       permanent: { ...(init.address.permanent || {}) },
//       isPermanentSameAsCurrent: !!init.address.isPermanentSameAsCurrent,
//       isPG: !!init.address.isPG,
//       pgOwnerName: init.address.pgOwnerName,
//       pgName: init.address.pgName,
//       pgNumber: init.address.pgNumber,
//     },
//   });

//   // section refs for scrolling
//   const sectionRefs = useRef({});
//   const [editingSection, setEditingSection] = useState(null);
//   const [feedback, setFeedback] = useState(null);

//   // Password panel local state (controlled — safe and small)
//   const [showPasswordPanel, setShowPasswordPanel] = useState(false);
//   const [currentPassword, setCurrentPassword] = useState("");
//   const [newPassword, setNewPassword] = useState("");
//   const [confirmNewPassword, setConfirmNewPassword] = useState("");
//   const [passwordFeedback, setPasswordFeedback] = useState(null);
//   const [passwordLoading, setPasswordLoading] = useState(false);

//   // If candidate identity changes, refresh inputsRef to match fresh values
//   const candidateIdRef = useRef(candidate._id || candidate.id || null);
//   useEffect(() => {
//     const cid = candidate._id || candidate.id || null;
//     if (candidateIdRef.current !== cid) {
//       candidateIdRef.current = cid;
//       const fresh = computeInit(candidate);
//       // replace the inputsRef content
//       inputsRef.current = {
//         ...fresh,
//         address: {
//           current: { ...(fresh.address.current || {}) },
//           permanent: { ...(fresh.address.permanent || {}) },
//           isPermanentSameAsCurrent: !!fresh.address.isPermanentSameAsCurrent,
//           isPG: !!fresh.address.isPG,
//           pgOwnerName: fresh.address.pgOwnerName,
//           pgName: fresh.address.pgName,
//           pgNumber: fresh.address.pgNumber,
//         },
//       };
//       // reset UI state
//       setEditingSection(null);
//       setFeedback(null);
//       setShowPasswordPanel(false);
//       setCurrentPassword("");
//       setNewPassword("");
//       setConfirmNewPassword("");
//       setPasswordFeedback(null);
//     }
//   }, [candidate]);

//   // stable scroll helper
//   const scrollToSection = useCallback((k) => {
//     sectionRefs.current[k]?.scrollIntoView({
//       behavior: "smooth",
//       block: "start",
//     });
//   }, []);

//   // helpers: read current values from inputsRef
//   const readField = (name) => inputsRef.current[name];
//   const readAddressField = (section, key) => inputsRef.current.address?.[section]?.[key] || "";

//   // Save handler: reads from inputsRef and sends payload
//   const handleSaveSection = async (section) => {
//     let payload = {};
//     switch (section) {
//       case "personal":
//         payload = {
//           firstName: readField("firstName"),
//           lastName: readField("lastName"),
//           dob: readField("dob") || undefined,
//           Gender: readField("Gender"),
//           BloodGroup: readField("BloodGroup"),
//           fatherName: readField("fatherName"),
//           MotherName: readField("MotherName"),
//           email: readField("email"),
//           mobile: readField("mobile"),
//           AlternativeMobile: readField("AlternativeMobile"),
//         };
//         break;
//       case "job":
//         payload = {
//           Designation: readField("Designation"),
//           Salary: readField("Salary"),
//           DateOfJoining: readField("DateOfJoining") || undefined,
//           NextIncreament: readField("NextIncreament"),
//           NextIncreamentDate: readField("NextIncreamentDate") || undefined,
//         };
//         break;
//       case "address":
//         payload = {
//           address: {
//             current: { ...(inputsRef.current.address.current || {}) },
//             permanent: { ...(inputsRef.current.address.permanent || {}) },
//             isPermanentSameAsCurrent: !!inputsRef.current.address.isPermanentSameAsCurrent,
//             isPG: !!inputsRef.current.address.isPG,
//             pgOwnerName: inputsRef.current.address.pgOwnerName,
//             pgName: inputsRef.current.address.pgName,
//             pgNumber: inputsRef.current.address.pgNumber,
//           },
//         };
//         break;
//       case "ids":
//         payload = {
//           aadhaarNumber: readField("aadhaarNumber"),
//           panNumber: readField("panNumber"),
//           drivingLicenseNumber: readField("drivingLicenseNumber"),
//           pfNumber: readField("pfNumber"),
//           esicNumber: readField("esicNumber"),
//           medicalPolicyNumber: readField("medicalPolicyNumber"),
//         };
//         break;
//       case "marital":
//         payload = {
//           isMarried: !!inputsRef.current.isMarried,
//           spouseName: readField("spouseName"),
//           spouseNumber: readField("spouseNumber"),
//         };
//         break;
//       default:
//         payload = {};
//     }

//     try {
//       const res = await api.put(`/candidates/${candidate._id || candidate.id}`, payload);
//       setCandidate(res.data);
//       setFeedback({ section, type: "success", msg: "Saved!" });
//       setEditingSection(null);
//     } catch (err) {
//       console.error(err);
//       setFeedback({ section, type: "error", msg: err?.response?.data?.message || "Save failed" });
//     } finally {
//       setTimeout(() => setFeedback(null), 3000);
//     }
//   };

//   // Uncontrolled inputs update the inputsRef directly — these handlers do not call setState, so no re-render
//   const onInputChange = (name, value) => {
//     inputsRef.current[name] = value;
//   };
//   const onAddressChange = (section, key, value) => {
//     inputsRef.current.address = inputsRef.current.address || { current: {}, permanent: {} };
//     inputsRef.current.address[section] = inputsRef.current.address[section] || {};
//     inputsRef.current.address[section][key] = value;
//   };
//   const onCheckboxChange = (name, checked) => {
//     inputsRef.current[name] = !!checked;
//   };
//   const onAddressCheckbox = (name, checked) => {
//     inputsRef.current.address[name] = !!checked;
//   };

//   // password helpers (keep these controlled)
//   const resetPasswordPanel = () => {
//     setCurrentPassword("");
//     setNewPassword("");
//     setConfirmNewPassword("");
//     setPasswordFeedback(null);
//   };

//   const handleSetInitialPassword = async () => {
//     if (!newPassword) return setPasswordFeedback({ type: "error", msg: "Enter new password" });
//     if (newPassword.length < 6) return setPasswordFeedback({ type: "error", msg: "Password must be >= 6 chars" });
//     if (newPassword !== confirmNewPassword) return setPasswordFeedback({ type: "error", msg: "Passwords do not match" });

//     setPasswordLoading(true);
//     try {
//       const id = candidate._id || candidate.id;
//       await api.put(`/candidates/${id}`, { password: newPassword });
//       const res = await api.get(`/candidates/${id}`);
//       setCandidate(res.data);
//       setPasswordFeedback({ type: "success", msg: "Password set successfully" });
//       resetPasswordPanel();
//     } catch (err) {
//       console.error(err);
//       setPasswordFeedback({ type: "error", msg: err?.response?.data?.message || "Failed to set password" });
//     } finally {
//       setPasswordLoading(false);
//       setTimeout(() => setPasswordFeedback(null), 3500);
//     }
//   };

//   const handleChangePassword = async () => {
//     if (!currentPassword) return setPasswordFeedback({ type: "error", msg: "Enter current password" });
//     if (!newPassword) return setPasswordFeedback({ type: "error", msg: "Enter new password" });
//     if (newPassword.length < 6) return setPasswordFeedback({ type: "error", msg: "Password must be >= 6 chars" });
//     if (newPassword !== confirmNewPassword) return setPasswordFeedback({ type: "error", msg: "Passwords do not match" });

//     setPasswordLoading(true);
//     try {
//       const id = candidate._id || candidate.id;
//       await api.post(`/candidates/${id}/change-password`, { currentPassword, newPassword });
//       setPasswordFeedback({ type: "success", msg: "Password changed successfully" });
//       resetPasswordPanel();
//     } catch (err) {
//       console.error(err);
//       setPasswordFeedback({ type: "error", msg: err?.response?.data?.message || "Failed to change password" });
//     } finally {
//       setPasswordLoading(false);
//       setTimeout(() => setPasswordFeedback(null), 3500);
//     }
//   };

//   // UI Section wrapper
//   function SectionEditor({ title, sectionKey, children }) {
//     return (
//       <div ref={(el) => (sectionRefs.current[sectionKey] = el)} className="bg-white rounded-xl shadow p-4 space-y-2">
//         <div className="flex justify-between items-center mb-2">
//           <h3 className="text-sm font-semibold">{title}</h3>
//           {editingSection === sectionKey ? (
//             <div className="flex gap-2">
//               <button onClick={() => setEditingSection(null)} className="px-2 py-1 border rounded text-xs">
//                 Cancel
//               </button>
//               <button onClick={() => handleSaveSection(sectionKey)} className="px-2 py-1 bg-indigo-600 text-white rounded text-xs">
//                 Save
//               </button>
//             </div>
//           ) : (
//             <button
//               onClick={() => {
//                 setEditingSection(sectionKey);
//                 scrollToSection(sectionKey);
//               }}
//               className="text-indigo-600 text-xs hover:underline"
//             >
//               Edit
//             </button>
//           )}
//         </div>

//         {feedback?.section === sectionKey && (
//           <div className={`text-xs ${feedback.type === "success" ? "text-green-600" : "text-red-600"} mb-2`}>{feedback.msg}</div>
//         )}

//         <div className={`${editingSection !== sectionKey ? "opacity-70 pointer-events-none" : ""}`}>{children}</div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-4 max-h-[70vh] overflow-y-auto">
//       {/* Personal Section */}
//       <SectionEditor title="Personal Details" sectionKey="personal">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="text-xs text-gray-500">First name</label>
//             <input
//               name="firstName"
//               defaultValue={init.firstName}
//               onChange={(e) => onInputChange("firstName", e.target.value)}
//               className="w-full border rounded px-2 py-1"
//               autoComplete="off"
//             />
//           </div>
//           <div>
//             <label className="text-xs text-gray-500">Last name</label>
//             <input
//               name="lastName"
//               defaultValue={init.lastName}
//               onChange={(e) => onInputChange("lastName", e.target.value)}
//               className="w-full border rounded px-2 py-1"
//               autoComplete="off"
//             />
//           </div>
//           <div>
//             <label className="text-xs text-gray-500">Email</label>
//             <input
//               name="email"
//               defaultValue={init.email}
//               onChange={(e) => onInputChange("email", e.target.value)}
//               className="w-full border rounded px-2 py-1"
//               autoComplete="off"
//             />
//           </div>
//           <div>
//             <label className="text-xs text-gray-500">Mobile</label>
//             <input
//               name="mobile"
//               defaultValue={init.mobile}
//               onChange={(e) => onInputChange("mobile", e.target.value)}
//               className="w-full border rounded px-2 py-1"
//               autoComplete="off"
//             />
//           </div>
//           <div>
//             <label className="text-xs text-gray-500">Alternative Mobile</label>
//             <input
//               name="AlternativeMobile"
//               defaultValue={init.AlternativeMobile}
//               onChange={(e) => onInputChange("AlternativeMobile", e.target.value)}
//               className="w-full border rounded px-2 py-1"
//               autoComplete="off"
//             />
//           </div>
//           <div>
//             <label className="text-xs text-gray-500">DOB</label>
//             <input
//               name="dob"
//               type="date"
//               defaultValue={init.dob}
//               onChange={(e) => onInputChange("dob", e.target.value)}
//               className="w-full border rounded px-2 py-1"
//             />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">Gender</label>
//             <select name="Gender" defaultValue={init.Gender} onChange={(e) => onInputChange("Gender", e.target.value)} className="w-full border rounded px-2 py-1">
//               <option value="">Select</option>
//               <option value="male">Male</option>
//               <option value="female">Female</option>
//             </select>
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">Blood Group</label>
//             <input
//               name="BloodGroup"
//               defaultValue={init.BloodGroup}
//               onChange={(e) => onInputChange("BloodGroup", e.target.value)}
//               className="w-full border rounded px-2 py-1"
//               autoComplete="off"
//             />
//           </div>
//         </div>
//       </SectionEditor>

//       {/* Marital */}
//       <SectionEditor title="Marital" sectionKey="marital">
//         <div className="flex items-center gap-2">
//           <input
//             id="isMarried"
//             type="checkbox"
//             defaultChecked={init.isMarried}
//             onChange={(e) => onCheckboxChange("isMarried", e.target.checked)}
//           />
//           <label htmlFor="isMarried">Married</label>
//         </div>
//         <div style={{ display: editingSection === "marital" ? "block" : "none" }}>
//           { (init.isMarried || editingSection === "marital") && (
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
//               <div>
//                 <label className="text-xs text-gray-500">Spouse Name</label>
//                 <input defaultValue={init.spouseName} onChange={(e) => onInputChange("spouseName", e.target.value)} className="w-full border rounded px-2 py-1" />
//               </div>
//               <div>
//                 <label className="text-xs text-gray-500">Spouse Number</label>
//                 <input defaultValue={init.spouseNumber} onChange={(e) => onInputChange("spouseNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
//               </div>
//             </div>
//           )}
//         </div>
//       </SectionEditor>

//       {/* Job */}
//       <SectionEditor title="Job Info" sectionKey="job">
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <div>
//             <label className="text-xs text-gray-500">Company</label>
//             <input type="text" disabled value="SLOG" className="w-full border rounded px-2 py-1 bg-gray-100 cursor-not-allowed" />
//           </div>
//           <div>
//             <label className="text-xs text-gray-500">Designation</label>
//             <input defaultValue={init.Designation} onChange={(e) => onInputChange("Designation", e.target.value)} className="w-full border rounded px-2 py-1" />
//           </div>
//           <div>
//             <label className="text-xs text-gray-500">Salary</label>
//             <input defaultValue={init.Salary} onChange={(e) => onInputChange("Salary", e.target.value)} className="w-full border rounded px-2 py-1" />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">Date of Joining</label>
//             <input type="date" defaultValue={init.DateOfJoining} onChange={(e) => onInputChange("DateOfJoining", e.target.value)} className="w-full border rounded px-2 py-1" />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">Next Increment</label>
//             <input defaultValue={init.NextIncreament} onChange={(e) => onInputChange("NextIncreament", e.target.value)} className="w-full border rounded px-2 py-1" />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">Next Increment Date</label>
//             <input type="date" defaultValue={init.NextIncreamentDate} onChange={(e) => onInputChange("NextIncreamentDate", e.target.value)} className="w-full border rounded px-2 py-1" />
//           </div>
//         </div>
//       </SectionEditor>

//       {/* Address */}
//       <SectionEditor title="Addresses" sectionKey="address">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           {["current", "permanent"].map((section) => (
//             <div key={section}>
//               <h3 className="text-sm font-semibold">{section === "current" ? "Current Address" : "Permanent Address"}</h3>
//               {["line1", "line2", "city", "state", "pincode"].map((f) => (
//                 <div key={f}>
//                   <label className="text-xs text-gray-500">{f}</label>
//                   <input
//                     defaultValue={init.address?.[section]?.[f] || ""}
//                     onChange={(e) => onAddressChange(section, f, e.target.value)}
//                     className="w-full border rounded px-2 py-1"
//                   />
//                 </div>
//               ))}

//               {section === "permanent" && (
//                 <div className="flex items-center gap-2 mt-2">
//                   <input
//                     type="checkbox"
//                     defaultChecked={init.address?.isPermanentSameAsCurrent}
//                     onChange={(e) => onAddressCheckbox("isPermanentSameAsCurrent", e.target.checked)}
//                   />
//                   <label>Same as Current Address</label>
//                 </div>
//               )}
//             </div>
//           ))}
//         </div>

//         <div className="mt-3">
//           <div className="flex items-center gap-2">
//             <input
//               type="checkbox"
//               defaultChecked={init.address?.isPG}
//               onChange={(e) => onAddressCheckbox("isPG", e.target.checked)}
//             />
//             <label>PG / Rent</label>
//           </div>

//           { (init.address?.isPG || editingSection === "address") && (
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
//               <div>
//                 <label className="text-xs text-gray-500">PG Owner Name</label>
//                 <input defaultValue={init.address.pgOwnerName} onChange={(e) => { inputsRef.current.address.pgOwnerName = e.target.value; }} className="w-full border rounded px-2 py-1" />
//               </div>
//               <div>
//                 <label className="text-xs text-gray-500">PG Name</label>
//                 <input defaultValue={init.address.pgName} onChange={(e) => { inputsRef.current.address.pgName = e.target.value; }} className="w-full border rounded px-2 py-1" />
//               </div>
//               <div>
//                 <label className="text-xs text-gray-500">PG Number</label>
//                 <input defaultValue={init.address.pgNumber} onChange={(e) => { inputsRef.current.address.pgNumber = e.target.value; }} className="w-full border rounded px-2 py-1" />
//               </div>
//             </div>
//           )}
//         </div>
//       </SectionEditor>

//       {/* IDs & Policies */}
//       <SectionEditor title="IDs & Policies" sectionKey="ids">
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <div>
//             <label className="text-xs text-gray-500">Aadhaar</label>
//             <input defaultValue={init.aadhaarNumber} onChange={(e) => onInputChange("aadhaarNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
//           </div>
//           <div>
//             <label className="text-xs text-gray-500">PAN</label>
//             <input defaultValue={init.panNumber} onChange={(e) => onInputChange("panNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
//           </div>
//           <div>
//             <label className="text-xs text-gray-500">Driving License</label>
//             <input defaultValue={init.drivingLicenseNumber} onChange={(e) => onInputChange("drivingLicenseNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
//           </div>

//           <div>
//             <label className="text-xs text-gray-500">PF Number</label>
//             <input defaultValue={init.pfNumber} onChange={(e) => onInputChange("pfNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
//           </div>
//           <div>
//             <label className="text-xs text-gray-500">ESIC Number</label>
//             <input defaultValue={init.esicNumber} onChange={(e) => onInputChange("esicNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
//           </div>
//           <div>
//             <label className="text-xs text-gray-500">Medical Policy</label>
//             <input defaultValue={init.medicalPolicyNumber} onChange={(e) => onInputChange("medicalPolicyNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
//           </div>
//         </div>
//       </SectionEditor>

//       {/* Password Panel */}
//       <div className="bg-white rounded-xl shadow p-4">
//         <div className="flex justify-between items-center mb-2">
//           <h3 className="text-sm font-semibold">Password</h3>
//           <button onClick={() => setShowPasswordPanel((s) => !s)} className="text-indigo-600 text-xs hover:underline">
//             {showPasswordPanel ? "Hide" : "Manage"}
//           </button>
//         </div>

//         {showPasswordPanel ? (
//           <div className="space-y-3">
//             <div className="text-xs text-gray-500">
//               Use this panel to set an initial password (if the user has none) or change an existing password.
//             </div>

//             <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
//               <div>
//                 <label className="text-xs text-gray-500">Current Password (required to change)</label>
//                 <input
//                   autoComplete="off"
//                   type="password"
//                   value={currentPassword}
//                   onChange={(e) => setCurrentPassword(e.target.value)}
//                   className="w-full border rounded px-2 py-1"
//                   placeholder="Current password (leave blank to set initial)"
//                 />
//               </div>
//               <div>
//                 <label className="text-xs text-gray-500">New Password</label>
//                 <input
//                   autoComplete="off"
//                   type="password"
//                   value={newPassword}
//                   onChange={(e) => setNewPassword(e.target.value)}
//                   className="w-full border rounded px-2 py-1"
//                   placeholder="New password (min 6 chars)"
//                 />
//               </div>
//               <div>
//                 <label className="text-xs text-gray-500">Confirm New Password</label>
//                 <input
//                   autoComplete="off"
//                   type="password"
//                   value={confirmNewPassword}
//                   onChange={(e) => setConfirmNewPassword(e.target.value)}
//                   className="w-full border rounded px-2 py-1"
//                   placeholder="Confirm new password"
//                 />
//               </div>
//             </div>

//             <div className="flex gap-2">
//               <button
//                 onClick={async () => {
//                   if (currentPassword) await handleChangePassword();
//                   else await handleSetInitialPassword();
//                 }}
//                 disabled={passwordLoading}
//                 className="px-3 py-1 bg-indigo-600 text-white rounded"
//               >
//                 {passwordLoading ? "Working..." : currentPassword ? "Change Password" : "Set Password"}
//               </button>

//               <button
//                 onClick={() => {
//                   resetPasswordPanel();
//                 }}
//                 type="button"
//                 className="px-3 py-1 border rounded"
//               >
//                 Clear
//               </button>
//             </div>

//             {passwordFeedback && (
//               <div className={`text-sm ${passwordFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}>
//                 {passwordFeedback.msg}
//               </div>
//             )}

//             <div className="text-xs text-gray-400">
//               Note: Changing password will update the linked user account. If the user has no password set, leaving "Current password" blank and clicking "Set Password" will add one.
//             </div>
//           </div>
//         ) : (
//           <div className="text-xs text-gray-500">No password actions shown. Click "Manage" to set or change password.</div>
//         )}
//       </div>
//     </div>
//   );
// });
// CandidateProfilePage.jsx


import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PencilIcon } from "@heroicons/react/24/outline";
import api from "../api/axios";
import Modal from "../components/Modal";

const STATUS_ORDER = [
  "applied",
  "verifying",
  "interviewing",
  "offered",
  "accepted",
  "rejected",
];
const prettyStatus = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "-");

export default function CandidateProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // photo modal state
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  // derived id used for API calls (candidate._id may not exist immediately)
  const candidateId = candidate?._id || id;

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get(`/candidates/${id}`);
        if (!mounted) return;
        setCandidate(res.data);
      } catch (err) {
        console.error(err);
        alert(err?.response?.data?.message || "Failed to load candidate");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      try {
        const res = await api.get(`/candidates/${id}/documents`);
        if (!mounted) return;
        setDocs(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        setDocs([]);
      }
    })();
    return () => (mounted = false);
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading candidate...</div>;
  if (!candidate)
    return (
      <div className="p-8 text-center text-gray-500">Candidate not found</div>
    );

  const currentIdx = Math.max(0, STATUS_ORDER.indexOf(candidate.status || "applied"));

  const updateStatus = async (newStatus) => {
    if (!newStatus || candidate.status === newStatus) return;
    const prev = candidate.status;
    setCandidate((c) => ({ ...c, status: newStatus }));
    try {
      await api.put(`/candidates/${candidateId}`, { status: newStatus });
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to update status");
      setCandidate((c) => ({ ...c, status: prev }));
    }
  };

  const handleVerifyMobile = async () => {
    if (candidate.mobileVerified) return alert("Mobile already verified");
    setVerifying(true);
    const prev = { ...candidate };
    setCandidate((c) => ({ ...c, mobileVerified: true }));
    try {
      const payload = { mobileVerified: true };
      if ((candidate.status || "applied") === "applied") payload.status = "verifying";
      await api.put(`/candidates/${candidateId}`, payload);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Verify failed");
      setCandidate(prev);
    } finally {
      setVerifying(false);
    }
  };

  const createdAt = candidate.createdAt ? new Date(candidate.createdAt).toLocaleString() : "-";

  // Helpers to render value or '-' and to format date
  const show = (val) => (val === null || val === undefined || val === "" ? "-" : val);
  const showDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : "-");

  // Photo upload utilities: passed to PhotoModal
  const refreshCandidate = async () => {
    try {
      const res = await api.get(`/candidates/${candidateId}`);
      setCandidate(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Header & Status Controls */}
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar with overlay pencil */}
          <div className="relative">
            <button
              onClick={() => setPhotoModalOpen(true)}
              className="w-20 h-20 rounded-full overflow-hidden border bg-gray-100 flex items-center justify-center focus:outline-none"
              title="View / change photo"
            >
              {candidate.photoUrl ? (
                <img src={candidate.photoUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-500 font-semibold text-lg">
                  {(candidate.firstName?.[0] || candidate.lastName?.[0] || "?").toUpperCase()}
                </div>
              )}
            </button>

            {/* small pencil icon overlay */}
            <button
              onClick={() => setPhotoModalOpen(true)}
              className="absolute right-0 bottom-0 -translate-y-1/4 -translate-x-1/4 bg-white rounded-full p-1 shadow border"
              aria-label="Edit photo"
            >
              <PencilIcon className="w-4 h-4 text-gray-700" />
            </button>
          </div>

          <div>
            <button onClick={() => navigate("/candidates")} className="text-sm text-indigo-600 hover:underline">
              &larr; Back
            </button>
            <h1 className="text-2xl font-semibold mt-2">
              {show(candidate.firstName)} {candidate.lastName ? show(candidate.lastName) : ""}
            </h1>
            <div className="text-sm text-gray-500 mt-1">
              {show(candidate.email)} • {show(candidate.mobile)}
            </div>
            <div className="text-xs text-gray-400 mt-1">Created: {createdAt}</div>
            {/* NEW: show empCode if present */}
            <div className="text-sm mt-1">
              <span className="text-xs text-gray-500 mr-2">Employee Code:</span>
              <span className="font-medium">{candidate.empCode || "-"}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button className="px-3 py-1 rounded bg-green-500 text-white-800 border border-green-200" onClick={() => navigate(`/idcard/${candidateId}`)}>
            Candidate Card
          </button>

          <button
            onClick={handleVerifyMobile}
            disabled={verifying || candidate.mobileVerified}
            className={`px-3 py-1 rounded ${candidate.mobileVerified ? "bg-green-100 text-green-800 border border-green-200" : "bg-indigo-600 text-white"}`}
          >
            {candidate.mobileVerified ? "Mobile Verified" : verifying ? "Verifying..." : "Verify Mobile"}
          </button>

          <select value={candidate.status || "applied"} onChange={(e) => updateStatus(e.target.value)} className="px-2 py-1 border rounded">
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {prettyStatus(s)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline */}
        <div className="col-span-1 bg-white rounded-xl shadow p-4">
          <div className="text-sm font-semibold mb-3">Timeline</div>
          <div className="space-y-4">
            {STATUS_ORDER.map((step, idx) => {
              const completed = idx < currentIdx;
              const active = idx === currentIdx;
              return (
                <div key={step} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${completed ? "bg-green-600" : active ? "bg-indigo-600" : "bg-gray-300"}`}>
                      {completed ? "✓" : idx + 1}
                    </div>
                    {idx !== STATUS_ORDER.length - 1 && (
                      <div className={`w-px flex-1 ${idx < currentIdx ? "bg-green-200" : "bg-gray-200"}`} style={{ height: 28 }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${active ? "text-indigo-700" : completed ? "text-gray-700" : "text-gray-500"}`}>
                      {prettyStatus(step)}
                    </div>
                    {active && !completed && (
                      <button
                        onClick={() => {
                          // route to task pages for steps that require action
                          switch (step) {
                            case "applied":
                              // applied: just advance status locally/server-side
                              updateStatus("verifying"); // or leave as-is if you want applied -> verifying automatically
                              break;
                            case "verifying":
                              navigate(`/candidates/${candidateId}/verify`);
                              break;
                            case "interviewing":
                              navigate(`/candidates/${candidateId}/interview`);
                              break;
                            case "offered":
                              navigate(`/candidates/${candidateId}/offer`);
                              break;
                            default:
                              // fallback: just advance to next
                              updateStatus(STATUS_ORDER[Math.min(currentIdx + 1, STATUS_ORDER.length - 1)]);
                          }
                        }}
                        className="mt-1 px-3 py-1 bg-indigo-600 text-white rounded text-xs"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Candidate Details */}
        <div className="col-span-2 bg-white rounded-xl shadow p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Candidate Details</h2>
            <button onClick={() => setEditModalOpen(true)} className="text-indigo-600 hover:text-indigo-800">
              <PencilIcon className="w-5 h-5 inline" />
            </button>
          </div>

          {/* Personal Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Full Name</div>
              <div>{(candidate.firstName || "") + (candidate.lastName ? " " + candidate.lastName : "") || "-"}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Email</div>
              <div>{show(candidate.email)}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Mobile</div>
              <div>{show(candidate.mobile)}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Alternative Mobile</div>
              <div>{show(candidate.AlternativeMobile)}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">DOB</div>
              <div>{candidate.dob ? showDate(candidate.dob) : "-"}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Gender</div>
              <div>{show(candidate.Gender)}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Blood Group</div>
              <div>{show(candidate.BloodGroup)}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Department</div>
              <div>{show(candidate.department)}</div>
            </div>
          </div>

          {/* Parents & Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Father</div>
              <div>{show(candidate.fatherName)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Father Mobile</div>
              <div>{show(candidate.fatherMobile)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mother</div>
              <div>{show(candidate.MotherName)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Mobile Verified</div>
              <div>{candidate.mobileVerified ? "Yes" : "No"}</div>
            </div>
          </div>

          {/* Marital */}
          <div>
            <div className="text-xs text-gray-500">Marital Status</div>
            {candidate.isMarried ? (
              <div className="space-y-1">
                <div>Married</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <div>
                    <div className="text-xs text-gray-500">Spouse Name</div>
                    <div>{show(candidate.spouseName)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Spouse Number</div>
                    <div>{show(candidate.spouseNumber)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div>Not married</div>
            )}
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Current Address</div>
              <div>{show(candidate.address?.current?.line1)}</div>
              <div>{show(candidate.address?.current?.line2)}</div>
              <div>
                {show(candidate.address?.current?.city)}, {show(candidate.address?.current?.state)} {show(candidate.address?.current?.pincode)}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-1">Permanent Address</div>
              <div>{show(candidate.address?.permanent?.line1)}</div>
              <div>{show(candidate.address?.permanent?.line2)}</div>
              <div>
                {show(candidate.address?.permanent?.city)}, {show(candidate.address?.permanent?.state)} {show(candidate.address?.permanent?.pincode)}
              </div>

              <div className="text-xs text-gray-400 mt-2">
                {candidate.address?.isPermanentSameAsCurrent ? "Permanent same as current" : ""}
              </div>
            </div>
          </div>

          {/* PG Info (only if isPG true) */}
          {candidate.address?.isPG && (
            <div className="bg-gray-50 border rounded p-3">
              <div className="text-xs text-gray-500">Living Arrangement</div>
              <div className="mt-1">Living in PG / Rent</div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                <div>
                  <div className="text-xs text-gray-500">PG Owner</div>
                  <div>{show(candidate.address?.pgOwnerName)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">PG Name</div>
                  <div>{show(candidate.address?.pgName)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">PG Number</div>
                  <div>{show(candidate.address?.pgNumber)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Job Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500">Company</div>
              <div>SLOG</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Designation</div>
              <div>{show(candidate.Designation)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Salary</div>
              <div>{show(candidate.Salary)}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">Date of Joining</div>
              <div>{candidate.DateOfJoining ? showDate(candidate.DateOfJoining) : "-"}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Next Increment</div>
              <div>{show(candidate.NextIncreament)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Next Increment Date</div>
              <div>{candidate.NextIncreamentDate ? showDate(candidate.NextIncreamentDate) : "-"}</div>
            </div>
          </div>

          {/* IDs & Policies */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500">Aadhaar</div>
              <div>{show(candidate.aadhaarNumber)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">PAN</div>
              <div>{show(candidate.panNumber)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Driving License</div>
              <div>{show(candidate.drivingLicenseNumber)}</div>
            </div>

            <div>
              <div className="text-xs text-gray-500">PF Number</div>
              <div>{show(candidate.pfNumber)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">ESIC Number</div>
              <div>{show(candidate.esicNumber)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Medical Policy</div>
              <div>{show(candidate.medicalPolicyNumber)}</div>
            </div>
          </div>

          {/* Documents */}
          <div>
            <div className="flex items-center justify-between font-semibold text-sm mb-2">
              Documents <span className="text-gray-500 text-xs">{docs.length} files</span>
            </div>
            {docs.length === 0 ? (
              <div className="text-sm text-gray-500">No documents uploaded</div>
            ) : (
              docs.map((d) => (
                <div key={d._id || d.id} className="flex items-center justify-between gap-2 mb-1">
                  <div className="font-medium text-sm">{d.filename || d.name}</div>
                  <div className="flex gap-2">
                    <a href={d.url || `/uploads/${d.filename}`} target="_blank" rel="noreferrer" className="text-indigo-600 underline text-sm">
                      Open
                    </a>
                    <button onClick={() => setPreviewDoc(d)} className="px-2 py-1 text-sm border rounded">
                      Preview
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Candidate">
        <EditableCandidateForm
          candidate={candidate}
          setCandidate={(updated) => {
            // update parent immediately
            setCandidate(updated);
          }}
        />
      </Modal>

      {/* Photo Modal */}
      <Modal isOpen={photoModalOpen} onClose={() => setPhotoModalOpen(false)} title="Profile Photo">
        <PhotoModalContent candidate={candidate} onClose={() => setPhotoModalOpen(false)} onUploaded={refreshCandidate} />
      </Modal>

      {/* Document Preview Modal */}
      <Modal isOpen={!!previewDoc} onClose={() => setPreviewDoc(null)} title={previewDoc?.filename || "Preview"}>
        {previewDoc?.contentType?.startsWith("image/") ? (
          <img src={previewDoc.url} alt={previewDoc.filename} className="w-full h-auto" />
        ) : (
          <a href={previewDoc?.url} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
            {previewDoc?.filename || "Open document"}
          </a>
        )}
      </Modal>
    </div>
  );
}

// Photo modal content component
function PhotoModalContent({ candidate, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(candidate.photoUrl || null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  useEffect(() => {
    setPreview(candidate.photoUrl || null);
    setFile(null);
  }, [candidate]);

  useEffect(() => {
    let url;
    if (file) {
      url = URL.createObjectURL(file);
      setPreview(url);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [file]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const upload = async () => {
    if (!file) return alert("Select a file first");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      // prefer candidate._id but fall back to route id
      const id = candidate._id || candidate.id;
      await api.post(`/candidates/${id}/photo`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      if (onUploaded) await onUploaded();
      alert("Uploaded");
      onClose();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const resetImage = async () => {
    if (!window.confirm("Reset profile photo to empty?")) return;
    try {
      const id = candidate._id || candidate.id;
      await api.put(`/candidates/${id}`, { photoUrl: "" });
      if (onUploaded) await onUploaded();
      alert("Reset");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Reset failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="preview" className="max-w-full max-h-[50vh] rounded-md object-contain" />
        ) : (
          <div className="w-48 h-48 rounded-full bg-gray-100 flex items-center justify-center">No image</div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
        <button type="button" onClick={() => inputRef.current?.click()} className="px-3 py-2 border rounded bg-white">
          Choose
        </button>
        <button type="button" onClick={upload} disabled={uploading} className="px-3 py-2 bg-indigo-600 text-white rounded">
          {uploading ? "Uploading..." : "Upload"}
        </button>
        <button type="button" onClick={resetImage} className="px-3 py-2 border rounded text-sm">
          Reset Image
        </button>
        <button type="button" onClick={onClose} className="px-3 py-2 border rounded text-sm">
          Close
        </button>
      </div>
    </div>
  );
}

// ================= Editable Candidate Form =================
// Uncontrolled inputs + inputsRef to avoid re-renders while typing
const EditableCandidateForm = React.memo(function EditableCandidateForm({ candidate, setCandidate }) {
  // compute initial values from candidate (only used to set defaultValue)
  const computeInit = (cand) => ({
    firstName: cand.firstName || "",
    lastName: cand.lastName || "",
    email: cand.email || "",
    mobile: cand.mobile || "",
    AlternativeMobile: cand.AlternativeMobile || "",
    fatherName: cand.fatherName || "",
    MotherName: cand.MotherName || "",
    dob: cand.dob?.slice(0, 10) || "",
    Gender: cand.Gender || "",
    BloodGroup: cand.BloodGroup || "",
    Designation: cand.Designation || "",
    Salary: cand.Salary || "",
    DateOfJoining: cand.DateOfJoining?.slice(0, 10) || "",
    NextIncreament: cand.NextIncreament || "",
    NextIncreamentDate: cand.NextIncreamentDate?.slice(0, 10) || "",
    address: {
      current: { ...(cand.address?.current || {}) },
      permanent: { ...(cand.address?.permanent || {}) },
      isPermanentSameAsCurrent: !!cand.address?.isPermanentSameAsCurrent,
      isPG: !!cand.address?.isPG,
      pgOwnerName: cand.address?.pgOwnerName || "",
      pgName: cand.address?.pgName || "",
      pgNumber: cand.address?.pgNumber || "",
    },
    aadhaarNumber: cand.aadhaarNumber || "",
    panNumber: cand.panNumber || "",
    drivingLicenseNumber: cand.drivingLicenseNumber || "",
    pfNumber: cand.pfNumber || "",
    esicNumber: cand.esicNumber || "",
    medicalPolicyNumber: cand.medicalPolicyNumber || "",
    isMarried: !!cand.isMarried,
    spouseName: cand.spouseName || "",
    spouseNumber: cand.spouseNumber || "",
  });

  const init = computeInit(candidate);

  // refs for inputs: store latest typed values here without causing re-renders
  const inputsRef = useRef({
    // shallow copy initial values (strings / primitives)
    ...init,
    address: {
      current: { ...(init.address.current || {}) },
      permanent: { ...(init.address.permanent || {}) },
      isPermanentSameAsCurrent: !!init.address.isPermanentSameAsCurrent,
      isPG: !!init.address.isPG,
      pgOwnerName: init.address.pgOwnerName,
      pgName: init.address.pgName,
      pgNumber: init.address.pgNumber,
    },
  });

  // section refs for scrolling
  const sectionRefs = useRef({});
  const [editingSection, setEditingSection] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Password panel local state (controlled — safe and small)
  const [showPasswordPanel, setShowPasswordPanel] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // EmpCode state & flow
  const [nextEmpCode, setNextEmpCode] = useState(null); // predicted next emp code
  const [empChoice, setEmpChoice] = useState("auto"); // 'auto' or 'manual'
  const [manualEmpCode, setManualEmpCode] = useState(candidate.empCode || ""); // only used when manual
  const [empWarning, setEmpWarning] = useState(null); // message from backend for sequence warnings
  const [empError, setEmpError] = useState(null); // uniqueness or other errors
  const [confirmEmpCodeChange, setConfirmEmpCodeChange] = useState(false); // when user confirms force change
  const [fetchingNextEmpCode, setFetchingNextEmpCode] = useState(false);

  // If candidate identity changes, refresh inputsRef to match fresh values
  const candidateIdRef = useRef(candidate._id || candidate.id || null);
  useEffect(() => {
    const cid = candidate._id || candidate.id || null;
    if (candidateIdRef.current !== cid) {
      candidateIdRef.current = cid;
      const fresh = computeInit(candidate);
      // replace the inputsRef content
      inputsRef.current = {
        ...fresh,
        address: {
          current: { ...(fresh.address.current || {}) },
          permanent: { ...(fresh.address.permanent || {}) },
          isPermanentSameAsCurrent: !!fresh.address.isPermanentSameAsCurrent,
          isPG: !!fresh.address.isPG,
          pgOwnerName: fresh.address.pgOwnerName,
          pgName: fresh.address.pgName,
          pgNumber: fresh.address.pgNumber,
        },
      };
      // reset UI state
      setEditingSection(null);
      setFeedback(null);
      setShowPasswordPanel(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordFeedback(null);

      // reset empCode UI
      setManualEmpCode(candidate.empCode || "");
      setEmpChoice(candidate.empCode ? "manual" : "auto");
      setEmpWarning(null);
      setEmpError(null);
      setConfirmEmpCodeChange(false);
      // fetch next emp code
      fetchNextEmpCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate]);

  useEffect(() => {
    // when the form mounts/focused show predicted emp code
    fetchNextEmpCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetch predicted emp code
  // fetch predicted emp code (defensive about response shape)
async function fetchNextEmpCode() {
  setFetchingNextEmpCode(true);
  try {
    const res = await api.get("/candidates/next-empcode");
    const data = res.data;

    // prefer explicit fields if present
    let next = null;
    if (!data) next = null;
    else if (typeof data === "string") next = data;
    else if (typeof data === "object") {
      // common shapes:
      // { next: "S20825" } or { nextEmpCode: "S20825" } or full object { nextEmpCode, currentMaxNumeric, ... }
      next = data.nextEmpCode ?? data.next ?? null;

      // if still null, fallback to a readable string so React can render it without error
      if (!next) {
        // make a compact safe string (avoid rendering raw object which causes React error)
        try {
          next = JSON.stringify(data);
        } catch (e) {
          next = String(data);
        }
      }
    } else {
      // fallback
      next = String(data);
    }

    setNextEmpCode(next);
    // if candidate has no empCode and manual not set, keep auto
    if (!candidate.empCode && !manualEmpCode) {
      setEmpChoice("auto");
    }
  } catch (err) {
    console.error("Failed to fetch next emp code", err);
    setNextEmpCode(null);
  } finally {
    setFetchingNextEmpCode(false);
  }
}


  // stable scroll helper
  const scrollToSection = useCallback((k) => {
    sectionRefs.current[k]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  // helpers: read current values from inputsRef
  const readField = (name) => inputsRef.current[name];
  const readAddressField = (section, key) => inputsRef.current.address?.[section]?.[key] || "";

  // Save handler: reads from inputsRef and sends payload
  // includes empCode logic
  const handleSaveSection = async (section) => {
    let payload = {};
    switch (section) {
      case "personal":
        payload = {
          firstName: readField("firstName"),
          lastName: readField("lastName"),
          dob: readField("dob") || undefined,
          Gender: readField("Gender"),
          BloodGroup: readField("BloodGroup"),
          fatherName: readField("fatherName"),
          MotherName: readField("MotherName"),
          email: readField("email"),
          mobile: readField("mobile"),
          AlternativeMobile: readField("AlternativeMobile"),
        };
        break;
      case "job":
        payload = {
          Designation: readField("Designation"),
          Salary: readField("Salary"),
          DateOfJoining: readField("DateOfJoining") || undefined,
          NextIncreament: readField("NextIncreament"),
          NextIncreamentDate: readField("NextIncreamentDate") || undefined,
        };
        break;
      case "address":
        payload = {
          address: {
            current: { ...(inputsRef.current.address.current || {}) },
            permanent: { ...(inputsRef.current.address.permanent || {}) },
            isPermanentSameAsCurrent: !!inputsRef.current.address.isPermanentSameAsCurrent,
            isPG: !!inputsRef.current.address.isPG,
            pgOwnerName: inputsRef.current.address.pgOwnerName,
            pgName: inputsRef.current.address.pgName,
            pgNumber: inputsRef.current.address.pgNumber,
          },
        };
        break;
      case "ids":
        payload = {
          aadhaarNumber: readField("aadhaarNumber"),
          panNumber: readField("panNumber"),
          drivingLicenseNumber: readField("drivingLicenseNumber"),
          pfNumber: readField("pfNumber"),
          esicNumber: readField("esicNumber"),
          medicalPolicyNumber: readField("medicalPolicyNumber"),
        };
        break;
      case "marital":
        payload = {
          isMarried: !!inputsRef.current.isMarried,
          spouseName: readField("spouseName"),
          spouseNumber: readField("spouseNumber"),
        };
        break;
      default:
        payload = {};
    }

    // include empCode if user changed choice or typed a manual value
    if (empChoice === "manual") {
      if (manualEmpCode && manualEmpCode !== candidate.empCode) {
        payload.empCode = manualEmpCode;
      }
    } else if (empChoice === "auto") {
      // use predicted nextEmpCode if candidate currently has no empCode (assign)
      if (!candidate.empCode && nextEmpCode) {
        payload.empCode = nextEmpCode;
      }
    }

    // include confirm flag if user confirmed sequence change
    if (confirmEmpCodeChange) {
      payload.confirmEmpCodeChange = true;
    }

    try {
      const res = await api.put(`/candidates/${candidate._id || candidate.id}`, payload);
      setCandidate(res.data);
      setFeedback({ section, type: "success", msg: "Saved!" });
      setEditingSection(null);
      // reset emp warnings/errors after successful save
      setEmpWarning(null);
      setEmpError(null);
      setConfirmEmpCodeChange(false);
    } catch (err) {
      console.error(err);
      const data = err?.response?.data;
      // handle sequence-warning style response; backend may send requiresConfirm flag
      if (data?.requiresConfirm || (data?.message && String(data.message).toLowerCase().includes("sequence"))) {
        setEmpWarning(data?.message || "This empCode will alter the current sequence. Confirm to force change.");
        setEmpError(null);
        // keep modal open so user can confirm
      } else if (err?.response?.status === 409 || (data?.message && String(data.message).toLowerCase().includes("exists"))) {
        setEmpError(data?.message || "empCode already exists");
        setEmpWarning(null);
      } else {
        setFeedback({ section, type: "error", msg: err?.response?.data?.message || "Save failed" });
      }
    } finally {
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  // Uncontrolled inputs update the inputsRef directly — these handlers do not call setState, so no re-render
  const onInputChange = (name, value) => {
    inputsRef.current[name] = value;
  };
  const onAddressChange = (section, key, value) => {
    inputsRef.current.address = inputsRef.current.address || { current: {}, permanent: {} };
    inputsRef.current.address[section] = inputsRef.current.address[section] || {};
    inputsRef.current.address[section][key] = value;
  };
  const onCheckboxChange = (name, checked) => {
    inputsRef.current[name] = !!checked;
  };
  const onAddressCheckbox = (name, checked) => {
    inputsRef.current.address[name] = !!checked;
  };

  // password helpers (keep these controlled)
  const resetPasswordPanel = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setPasswordFeedback(null);
  };

  const handleSetInitialPassword = async () => {
    if (!newPassword) return setPasswordFeedback({ type: "error", msg: "Enter new password" });
    if (newPassword.length < 6) return setPasswordFeedback({ type: "error", msg: "Password must be >= 6 chars" });
    if (newPassword !== confirmNewPassword) return setPasswordFeedback({ type: "error", msg: "Passwords do not match" });

    setPasswordLoading(true);
    try {
      const id = candidate._id || candidate.id;
      await api.put(`/candidates/${id}`, { password: newPassword });
      const res = await api.get(`/candidates/${id}`);
      setCandidate(res.data);
      setPasswordFeedback({ type: "success", msg: "Password set successfully" });
      resetPasswordPanel();
    } catch (err) {
      console.error(err);
      setPasswordFeedback({ type: "error", msg: err?.response?.data?.message || "Failed to set password" });
    } finally {
      setPasswordLoading(false);
      setTimeout(() => setPasswordFeedback(null), 3500);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) return setPasswordFeedback({ type: "error", msg: "Enter current password" });
    if (!newPassword) return setPasswordFeedback({ type: "error", msg: "Enter new password" });
    if (newPassword.length < 6) return setPasswordFeedback({ type: "error", msg: "Password must be >= 6 chars" });
    if (newPassword !== confirmNewPassword) return setPasswordFeedback({ type: "error", msg: "Passwords do not match" });

    setPasswordLoading(true);
    try {
      const id = candidate._id || candidate.id;
      await api.post(`/candidates/${id}/change-password`, { currentPassword, newPassword });
      setPasswordFeedback({ type: "success", msg: "Password changed successfully" });
      resetPasswordPanel();
    } catch (err) {
      console.error(err);
      setPasswordFeedback({ type: "error", msg: err?.response?.data?.message || "Failed to change password" });
    } finally {
      setPasswordLoading(false);
      setTimeout(() => setPasswordFeedback(null), 3500);
    }
  };

  // UI Section wrapper
  function SectionEditor({ title, sectionKey, children }) {
    return (
      <div ref={(el) => (sectionRefs.current[sectionKey] = el)} className="bg-white rounded-xl shadow p-4 space-y-2">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          {editingSection === sectionKey ? (
            <div className="flex gap-2">
              <button onClick={() => setEditingSection(null)} className="px-2 py-1 border rounded text-xs">
                Cancel
              </button>
              <button onClick={() => handleSaveSection(sectionKey)} className="px-2 py-1 bg-indigo-600 text-white rounded text-xs">
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setEditingSection(sectionKey);
                scrollToSection(sectionKey);
              }}
              className="text-indigo-600 text-xs hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {feedback?.section === sectionKey && (
          <div className={`text-xs ${feedback.type === "success" ? "text-green-600" : "text-red-600"} mb-2`}>{feedback.msg}</div>
        )}

        <div className={`${editingSection !== sectionKey ? "opacity-70 pointer-events-none" : ""}`}>{children}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">


      {/* EMP CODE CONTROL - shown at top so user can select auto/manual for assignment */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold">Employee Code</h3>
          <div className="text-xs text-gray-500">{candidate.empCode ? "Assigned" : "Not assigned"}</div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-gray-500">Current empCode: <span className="font-medium">{candidate.empCode || "-"}</span></div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="empChoice"
                checked={empChoice === "auto"}
                onChange={() => {
                  setEmpChoice("auto");
                  setEmpError(null);
                  setEmpWarning(null);
                }}
              />
              <span className="text-sm">Auto</span>
            </label>

            <div className="text-sm">
             {fetchingNextEmpCode ? (
  <span className="text-gray-500">Fetching next emp code...</span>
) : (
  <span>
    Predicted:&nbsp;
    <strong>
      {nextEmpCode
        ? (typeof nextEmpCode === "string" ? nextEmpCode : String(nextEmpCode))
        : "—"}
    </strong>
  </span>
)}

            </div>

            <label className="flex items-center gap-2 ml-4">
              <input
                type="radio"
                name="empChoice"
                checked={empChoice === "manual"}
                onChange={() => {
                  setEmpChoice("manual");
                  setEmpError(null);
                  setEmpWarning(null);
                }}
              />
              <span className="text-sm">Manual</span>
            </label>

            <input
              type="text"
              value={manualEmpCode}
              onChange={(e) => { setManualEmpCode(e.target.value); setEmpError(null); setEmpWarning(null); }}
              disabled={empChoice !== "manual"}
              placeholder="e.g. S20813"
              className="ml-3 border rounded px-2 py-1 text-sm"
            />
          </div>

          {empWarning && (
            <div className="text-sm text-yellow-700">
              {empWarning}
              <div className="mt-2">
                <button
                  onClick={() => { setConfirmEmpCodeChange(true); /* user confirms, now they'll need to re-click Save on the section */ }}
                  className="px-2 py-1 bg-yellow-600 text-white rounded text-xs"
                >
                  Confirm and Save
                </button>
              </div>
            </div>
          )}
          {empError && <div className="text-sm text-red-600">{empError}</div>}
          <div className="text-xs text-gray-400">Choose Auto to assign the next empCode (preview shown). Choose Manual to enter a specific empCode.</div>
        </div>
      </div>
{/* till here  */}


      {/* Personal Section */}
      <SectionEditor title="Personal Details" sectionKey="personal">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">First name</label>
            <input
              name="firstName"
              defaultValue={init.firstName}
              onChange={(e) => onInputChange("firstName", e.target.value)}
              className="w-full border rounded px-2 py-1"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Last name</label>
            <input
              name="lastName"
              defaultValue={init.lastName}
              onChange={(e) => onInputChange("lastName", e.target.value)}
              className="w-full border rounded px-2 py-1"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Email</label>
            <input
              name="email"
              defaultValue={init.email}
              onChange={(e) => onInputChange("email", e.target.value)}
              className="w-full border rounded px-2 py-1"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Mobile</label>
            <input
              name="mobile"
              defaultValue={init.mobile}
              onChange={(e) => onInputChange("mobile", e.target.value)}
              className="w-full border rounded px-2 py-1"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Alternative Mobile</label>
            <input
              name="AlternativeMobile"
              defaultValue={init.AlternativeMobile}
              onChange={(e) => onInputChange("AlternativeMobile", e.target.value)}
              className="w-full border rounded px-2 py-1"
              autoComplete="off"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">DOB</label>
            <input
              name="dob"
              type="date"
              defaultValue={init.dob}
              onChange={(e) => onInputChange("dob", e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">Gender</label>
            <select name="Gender" defaultValue={init.Gender} onChange={(e) => onInputChange("Gender", e.target.value)} className="w-full border rounded px-2 py-1">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">Blood Group</label>
            <input
              name="BloodGroup"
              defaultValue={init.BloodGroup}
              onChange={(e) => onInputChange("BloodGroup", e.target.value)}
              className="w-full border rounded px-2 py-1"
              autoComplete="off"
            />
          </div>
        </div>
      </SectionEditor>

      {/* Marital */}
      <SectionEditor title="Marital" sectionKey="marital">
        <div className="flex items-center gap-2">
          <input
            id="isMarried"
            type="checkbox"
            defaultChecked={init.isMarried}
            onChange={(e) => onCheckboxChange("isMarried", e.target.checked)}
          />
          <label htmlFor="isMarried">Married</label>
        </div>
        <div style={{ display: editingSection === "marital" ? "block" : "none" }}>
          { (init.isMarried || editingSection === "marital") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="text-xs text-gray-500">Spouse Name</label>
                <input defaultValue={init.spouseName} onChange={(e) => onInputChange("spouseName", e.target.value)} className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Spouse Number</label>
                <input defaultValue={init.spouseNumber} onChange={(e) => onInputChange("spouseNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
              </div>
            </div>
          )}
        </div>
      </SectionEditor>

      {/* Job */}
      <SectionEditor title="Job Info" sectionKey="job">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500">Company</label>
            <input type="text" disabled value="SLOG" className="w-full border rounded px-2 py-1 bg-gray-100 cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Designation</label>
            <input defaultValue={init.Designation} onChange={(e) => onInputChange("Designation", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Salary</label>
            <input defaultValue={init.Salary} onChange={(e) => onInputChange("Salary", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="text-xs text-gray-500">Date of Joining</label>
            <input type="date" defaultValue={init.DateOfJoining} onChange={(e) => onInputChange("DateOfJoining", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="text-xs text-gray-500">Next Increment</label>
            <input defaultValue={init.NextIncreament} onChange={(e) => onInputChange("NextIncreament", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="text-xs text-gray-500">Next Increment Date</label>
            <input type="date" defaultValue={init.NextIncreamentDate} onChange={(e) => onInputChange("NextIncreamentDate", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
        </div>
      </SectionEditor>

      {/* Address */}
      <SectionEditor title="Addresses" sectionKey="address">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {["current", "permanent"].map((section) => (
            <div key={section}>
              <h3 className="text-sm font-semibold">{section === "current" ? "Current Address" : "Permanent Address"}</h3>
              {["line1", "line2", "city", "state", "pincode"].map((f) => (
                <div key={f}>
                  <label className="text-xs text-gray-500">{f}</label>
                  <input
                    defaultValue={init.address?.[section]?.[f] || ""}
                    onChange={(e) => onAddressChange(section, f, e.target.value)}
                    className="w-full border rounded px-2 py-1"
                  />
                </div>
              ))}

              {section === "permanent" && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    defaultChecked={init.address?.isPermanentSameAsCurrent}
                    onChange={(e) => onAddressCheckbox("isPermanentSameAsCurrent", e.target.checked)}
                  />
                  <label>Same as Current Address</label>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              defaultChecked={init.address?.isPG}
              onChange={(e) => onAddressCheckbox("isPG", e.target.checked)}
            />
            <label>PG / Rent</label>
          </div>

          { (init.address?.isPG || editingSection === "address") && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              <div>
                <label className="text-xs text-gray-500">PG Owner Name</label>
                <input defaultValue={init.address.pgOwnerName} onChange={(e) => { inputsRef.current.address.pgOwnerName = e.target.value; }} className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">PG Name</label>
                <input defaultValue={init.address.pgName} onChange={(e) => { inputsRef.current.address.pgName = e.target.value; }} className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">PG Number</label>
                <input defaultValue={init.address.pgNumber} onChange={(e) => { inputsRef.current.address.pgNumber = e.target.value; }} className="w-full border rounded px-2 py-1" />
              </div>
            </div>
          )}
        </div>
      </SectionEditor>

      {/* IDs & Policies */}
      <SectionEditor title="IDs & Policies" sectionKey="ids">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500">Aadhaar</label>
            <input defaultValue={init.aadhaarNumber} onChange={(e) => onInputChange("aadhaarNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">PAN</label>
            <input defaultValue={init.panNumber} onChange={(e) => onInputChange("panNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Driving License</label>
            <input defaultValue={init.drivingLicenseNumber} onChange={(e) => onInputChange("drivingLicenseNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="text-xs text-gray-500">PF Number</label>
            <input defaultValue={init.pfNumber} onChange={(e) => onInputChange("pfNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">ESIC Number</label>
            <input defaultValue={init.esicNumber} onChange={(e) => onInputChange("esicNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Medical Policy</label>
            <input defaultValue={init.medicalPolicyNumber} onChange={(e) => onInputChange("medicalPolicyNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
        </div>
      </SectionEditor>

      {/* Password Panel */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold">Password</h3>
          <button onClick={() => setShowPasswordPanel((s) => !s)} className="text-indigo-600 text-xs hover:underline">
            {showPasswordPanel ? "Hide" : "Manage"}
          </button>
        </div>

        {showPasswordPanel ? (
          <div className="space-y-3">
            <div className="text-xs text-gray-500">
              Use this panel to set an initial password (if the user has none) or change an existing password.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Current Password (required to change)</label>
                <input
                  autoComplete="off"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                  placeholder="Current password (leave blank to set initial)"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">New Password</label>
                <input
                  autoComplete="off"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                  placeholder="New password (min 6 chars)"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Confirm New Password</label>
                <input
                  autoComplete="off"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (currentPassword) await handleChangePassword();
                  else await handleSetInitialPassword();
                }}
                disabled={passwordLoading}
                className="px-3 py-1 bg-indigo-600 text-white rounded"
              >
                {passwordLoading ? "Working..." : currentPassword ? "Change Password" : "Set Password"}
              </button>

              <button
                onClick={() => {
                  resetPasswordPanel();
                }}
                type="button"
                className="px-3 py-1 border rounded"
              >
                Clear
              </button>
            </div>

            {passwordFeedback && (
              <div className={`text-sm ${passwordFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}>
                {passwordFeedback.msg}
              </div>
            )}

            <div className="text-xs text-gray-400">
              Note: Changing password will update the linked user account. If the user has no password set, leaving "Current password" blank and clicking "Set Password" will add one.
            </div>
          </div>
        ) : (
          <div className="text-xs text-gray-500">No password actions shown. Click "Manage" to set or change password.</div>
        )}
      </div>
    </div>
  );
});

