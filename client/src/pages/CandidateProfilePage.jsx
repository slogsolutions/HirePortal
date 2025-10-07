// src/pages/CandidateProfilePage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PencilIcon } from "@heroicons/react/24/outline";
import api from "../api/axios";
import Modal from "../components/Modal";

const STATUS_ORDER = ["applied", "verifying", "interviewing", "offered", "accepted", "rejected"];
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
        alert(err?.response?.data?.message || "Failed to load candidate");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await api.get(`/candidates/${id}/documents`);
        setDocs(Array.isArray(res.data) ? res.data : []);
      } catch {
        setDocs([]);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-8 text-center">Loading candidate...</div>;
  if (!candidate) return <div className="p-8 text-center text-gray-500">Candidate not found</div>;

  const currentIdx = Math.max(0, STATUS_ORDER.indexOf(candidate.status || "applied"));

  const updateStatus = async (newStatus) => {
    if (!newStatus || candidate.status === newStatus) return;
    const prev = candidate.status;
    setCandidate((c) => ({ ...c, status: newStatus }));
    try {
      await api.put(`/candidates/${id}`, { status: newStatus });
    } catch (err) {
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
      await api.put(`/candidates/${id}`, payload);
    } catch (err) {
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
      const res = await api.get(`/candidates/${id}`);
      setCandidate(res.data);
    } catch {
      /* ignore */
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
                <div className="text-gray-500 font-semibold text-lg">{(candidate.firstName?.[0] || candidate.lastName?.[0] || "?").toUpperCase()}</div>
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
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
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
                    {idx !== STATUS_ORDER.length - 1 && <div className={`w-px flex-1 ${idx < currentIdx ? "bg-green-200" : "bg-gray-200"}`} style={{ height: 28 }} />}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${active ? "text-indigo-700" : completed ? "text-gray-700" : "text-gray-500"}`}>{prettyStatus(step)}</div>
                    {active && !completed && (
                      <button
                        onClick={() => updateStatus(STATUS_ORDER[Math.min(currentIdx + 1, STATUS_ORDER.length - 1)])}
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

              <div className="text-xs text-gray-400 mt-2">{candidate.address?.isPermanentSameAsCurrent ? "Permanent same as current" : ""}</div>
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
            {previewDoc?.filename}
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
      const res = await api.post(`/candidates/${candidate._id}/photo`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      // server should return updated candidate or photoUrl; best to refresh
      if (onUploaded) await onUploaded();
      alert("Uploaded");
      onClose();
    } catch (err) {
      alert(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const resetImage = async () => {
    if (!confirm("Reset profile photo to empty?")) return;
    try {
      // If your API supports deleting picture, call DELETE. Otherwise set photoUrl to empty via PUT.
      await api.put(`/candidates/${candidate._id}`, { photoUrl: "" });
      if (onUploaded) await onUploaded();
      alert("Reset");
    } catch (err) {
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
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="px-3 py-2 border rounded bg-white"
        >
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
// IMPORTANT: keep state purely local so typing doesn't lose focus
function EditableCandidateForm({ candidate, setCandidate }) {
  // initialize local state once on mount using candidate values
  const init = {
    firstName: candidate.firstName || "",
    lastName: candidate.lastName || "",
    email: candidate.email || "",
    mobile: candidate.mobile || "",
    AlternativeMobile: candidate.AlternativeMobile || "",
    fatherName: candidate.fatherName || "",
    MotherName: candidate.MotherName || "",
    dob: candidate.dob?.slice(0, 10) || "",
    Gender: candidate.Gender || "",
    BloodGroup: candidate.BloodGroup || "",
    company: "SLOG",
    Designation: candidate.Designation || "",
    Salary: candidate.Salary || "",
    DateOfJoining: candidate.DateOfJoining?.slice(0, 10) || "",
    NextIncreament: candidate.NextIncreament || "",
    NextIncreamentDate: candidate.NextIncreamentDate?.slice(0, 10) || "",
    address: {
      current: { ...(candidate.address?.current || {}) },
      permanent: { ...(candidate.address?.permanent || {}) },
      isPermanentSameAsCurrent: !!candidate.address?.isPermanentSameAsCurrent,
      isPG: !!candidate.address?.isPG,
      pgOwnerName: candidate.address?.pgOwnerName || "",
      pgName: candidate.address?.pgName || "",
      pgNumber: candidate.address?.pgNumber || ""
    },
    aadhaarNumber: candidate.aadhaarNumber || "",
    panNumber: candidate.panNumber || "",
    drivingLicenseNumber: candidate.drivingLicenseNumber || "",
    pfNumber: candidate.pfNumber || "",
    esicNumber: candidate.esicNumber || "",
    medicalPolicyNumber: candidate.medicalPolicyNumber || "",
    isMarried: !!candidate.isMarried,
    spouseName: candidate.spouseName || "",
    spouseNumber: candidate.spouseNumber || ""
  };

  const [form, setForm] = useState(init);
  const [editingSection, setEditingSection] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const sectionRefs = useRef({});

  // scroll helper
  const scrollToSection = (k) => sectionRefs.current[k]?.scrollIntoView({ behavior: "smooth", block: "start" });

  // small save handler per section
  const handleSaveSection = async (section) => {
    let payload = {};
    switch (section) {
      case "personal":
        payload = {
          firstName: form.firstName,
          lastName: form.lastName,
          dob: form.dob || undefined,
          Gender: form.Gender,
          BloodGroup: form.BloodGroup,
          fatherName: form.fatherName,
          MotherName: form.MotherName,
          email: form.email,
          mobile: form.mobile,
          AlternativeMobile: form.AlternativeMobile
        };
        break;
      case "job":
        payload = {
          Designation: form.Designation,
          Salary: form.Salary,
          DateOfJoining: form.DateOfJoining || undefined,
          NextIncreament: form.NextIncreament,
          NextIncreamentDate: form.NextIncreamentDate || undefined
        };
        break;
      case "address":
        payload = {
          address: {
            current: form.address.current,
            permanent: form.address.permanent,
            isPermanentSameAsCurrent: !!form.address.isPermanentSameAsCurrent,
            isPG: !!form.address.isPG,
            pgOwnerName: form.address.pgOwnerName,
            pgName: form.address.pgName,
            pgNumber: form.address.pgNumber
          }
        };
        break;
      case "ids":
        payload = {
          aadhaarNumber: form.aadhaarNumber,
          panNumber: form.panNumber,
          drivingLicenseNumber: form.drivingLicenseNumber,
          pfNumber: form.pfNumber,
          esicNumber: form.esicNumber,
          medicalPolicyNumber: form.medicalPolicyNumber
        };
        break;
      case "marital":
        payload = {
          isMarried: !!form.isMarried,
          spouseName: form.spouseName,
          spouseNumber: form.spouseNumber
        };
        break;
      default:
        payload = {};
    }

    try {
      const res = await api.put(`/candidates/${candidate._id}`, payload);
      // update parent
      setCandidate(res.data);
      setFeedback({ section, type: "success", msg: "Saved!" });
      setEditingSection(null);
    } catch (err) {
      setFeedback({ section, type: "error", msg: err?.response?.data?.message || "Save failed" });
    } finally {
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleChange = (name, value) => setForm((p) => ({ ...p, [name]: value }));
  const handleAddressChange = (section, field, value) =>
    setForm((p) => ({ ...p, address: { ...p.address, [section]: { ...p.address[section], [field]: value } } }));

  // copy current -> permanent
  const copyPermanent = (checked) => {
    if (!checked) {
      setForm((p) => ({ ...p, address: { ...p.address, isPermanentSameAsCurrent: false } }));
      return;
    }
    setForm((p) => ({ ...p, address: { ...p.address, permanent: { ...p.address.current }, isPermanentSameAsCurrent: true } }));
  };

  // UI Section wrapper (not memoized to avoid weird re-render swaps)
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

        {feedback?.section === sectionKey && <div className={`text-xs ${feedback.type === "success" ? "text-green-600" : "text-red-600"} mb-2`}>{feedback.msg}</div>}

        <div className={`${editingSection !== sectionKey ? "opacity-70 pointer-events-none" : ""}`}>{children}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      {/* Personal Section */}
      <SectionEditor title="Personal Details" sectionKey="personal">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">First name</label>
            <input name="firstName" value={form.firstName} onChange={(e) => handleChange("firstName", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Last name</label>
            <input name="lastName" value={form.lastName} onChange={(e) => handleChange("lastName", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Email</label>
            <input name="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Mobile</label>
            <input name="mobile" value={form.mobile} onChange={(e) => handleChange("mobile", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Alternative Mobile</label>
            <input name="AlternativeMobile" value={form.AlternativeMobile} onChange={(e) => handleChange("AlternativeMobile", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">DOB</label>
            <input name="dob" type="date" value={form.dob} onChange={(e) => handleChange("dob", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="text-xs text-gray-500">Gender</label>
            <select name="Gender" value={form.Gender} onChange={(e) => handleChange("Gender", e.target.value)} className="w-full border rounded px-2 py-1">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">Blood Group</label>
            <input name="BloodGroup" value={form.BloodGroup} onChange={(e) => handleChange("BloodGroup", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
        </div>
      </SectionEditor>

      {/* Marital */}
      <SectionEditor title="Marital" sectionKey="marital">
        <div className="flex items-center gap-2">
          <input id="isMarried" type="checkbox" checked={form.isMarried} onChange={(e) => setForm((p) => ({ ...p, isMarried: e.target.checked }))} />
          <label htmlFor="isMarried">Married</label>
        </div>
        {form.isMarried && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="text-xs text-gray-500">Spouse Name</label>
              <input value={form.spouseName} onChange={(e) => handleChange("spouseName", e.target.value)} className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Spouse Number</label>
              <input value={form.spouseNumber} onChange={(e) => handleChange("spouseNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
            </div>
          </div>
        )}
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
            <input value={form.Designation} onChange={(e) => handleChange("Designation", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Salary</label>
            <input value={form.Salary} onChange={(e) => handleChange("Salary", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="text-xs text-gray-500">Date of Joining</label>
            <input type="date" value={form.DateOfJoining} onChange={(e) => handleChange("DateOfJoining", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="text-xs text-gray-500">Next Increment</label>
            <input value={form.NextIncreament} onChange={(e) => handleChange("NextIncreament", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="text-xs text-gray-500">Next Increment Date</label>
            <input type="date" value={form.NextIncreamentDate} onChange={(e) => handleChange("NextIncreamentDate", e.target.value)} className="w-full border rounded px-2 py-1" />
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
                  <input value={form.address?.[section]?.[f] || ""} onChange={(e) => handleAddressChange(section, f, e.target.value)} className="w-full border rounded px-2 py-1" />
                </div>
              ))}

              {section === "permanent" && (
                <div className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={!!form.address.isPermanentSameAsCurrent} onChange={(e) => copyPermanent(e.target.checked)} />
                  <label>Same as Current Address</label>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={!!form.address.isPG} onChange={(e) => setForm((p) => ({ ...p, address: { ...p.address, isPG: e.target.checked } }))} />
            <label>PG / Rent</label>
          </div>

          {form.address.isPG && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              <div>
                <label className="text-xs text-gray-500">PG Owner Name</label>
                <input value={form.address.pgOwnerName} onChange={(e) => setForm((p) => ({ ...p, address: { ...p.address, pgOwnerName: e.target.value } }))} className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">PG Name</label>
                <input value={form.address.pgName} onChange={(e) => setForm((p) => ({ ...p, address: { ...p.address, pgName: e.target.value } }))} className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">PG Number</label>
                <input value={form.address.pgNumber} onChange={(e) => setForm((p) => ({ ...p, address: { ...p.address, pgNumber: e.target.value } }))} className="w-full border rounded px-2 py-1" />
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
            <input value={form.aadhaarNumber} onChange={(e) => handleChange("aadhaarNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">PAN</label>
            <input value={form.panNumber} onChange={(e) => handleChange("panNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Driving License</label>
            <input value={form.drivingLicenseNumber} onChange={(e) => handleChange("drivingLicenseNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>

          <div>
            <label className="text-xs text-gray-500">PF Number</label>
            <input value={form.pfNumber} onChange={(e) => handleChange("pfNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">ESIC Number</label>
            <input value={form.esicNumber} onChange={(e) => handleChange("esicNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Medical Policy</label>
            <input value={form.medicalPolicyNumber} onChange={(e) => handleChange("medicalPolicyNumber", e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
        </div>
      </SectionEditor>
    </div>
  );
}
