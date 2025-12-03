import React, { useEffect, useState, useRef } from "react";
import api from "../api/axios";
import {
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  CameraIcon,
  ArrowPathIcon,
  LockClosedIcon,
  DocumentIcon
} from "@heroicons/react/24/outline";

/* ---------------------------
  Helper small components
   - Badge (verification)
   - FieldRow (label + value / input)
----------------------------*/
function Badge({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs font-medium px-2 py-0.5 rounded-full ${
      ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
    }`}>
      {ok ? "✓" : "✕"} {label}
    </span>
  );
}

function FieldRow({ label, value, children, className = "" }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 ${className}`}>
      <div className="w-full sm:w-48 text-xs text-gray-500">{label}</div>
      <div className="flex-1 text-sm text-gray-800">{children ?? value ?? <span className="text-gray-400">—</span>}</div>
    </div>
  );
}

/* ---------------------------
  Profile Page
----------------------------*/
export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState(null); // e.g. 'personal' | 'contact' | 'employment' | 'ids' | 'address'
  const [local, setLocal] = useState({}); // local copy for editing
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await api.get("/candidates/me");
      // response shape: { status: 'success', data: { ... } }
      const p = (res?.data?.data) ? res.data.data : res.data;
      setProfile(p);
      setLocal(p); // shallow copy — we'll edit nested fields as needed
    } catch (err) {
      console.error("Failed to load profile:", err);
      alert("Failed to load profile. Check console for details.");
    } finally {
      setLoading(false);
    }
  }

  // toggle editing for a named section; prepare local copy
  function startEdit(section) {
    setEditingSection(section);
    setLocal(prev => ({ ...profile })); // reset local to latest profile
  }
  function cancelEdit() {
    setEditingSection(null);
    setLocal(profile);
    setPhotoFile(null);
    setPhotoPreview(null);
  }

  // Generic patch/save to /candidates/me
  async function saveSection(section) {
    try {
      // Build payload depending on section; simplest: send full candidate patch
      // Backend should accept partial updates (PATCH semantics). We use PATCH /candidates/me
      const payload = {};

      // For safety only include changed fields per section
      if (section === "personal") {
        payload.firstName = local.firstName;
        payload.lastName = local.lastName;
        payload.dob = local.dob;
        payload.Gender = local.Gender;
        payload.isMarried = local.isMarried;
        payload.spouseName = local.spouseName;
        payload.spouseNumber = local.spouseNumber;
      } else if (section === "contact") {
        payload.mobile = local.mobile;
        payload.AlternativeMobile = local.AlternativeMobile;
        payload.email = local.email;
      } else if (section === "employment") {
        payload.Designation = local.Designation;
        payload.department = local.department;
        payload.Salary = local.Salary;
        payload.NextIncreament = local.NextIncreament;
        payload.NextIncreamentDate = local.NextIncreamentDate;
        payload.DateOfJoining = local.DateOfJoining;
      } else if (section === "ids") {
        payload.aadhaarNumber = local.aadhaarNumber;
        payload.panNumber = local.panNumber;
        payload.drivingLicenseNumber = local.drivingLicenseNumber;
        payload.pfNumber = local.pfNumber;
        payload.esicNumber = local.esicNumber;
      } else if (section === "address") {
        payload.address = local.address;
      } else {
        // fallback: send everything in local (useful for "all")
        Object.assign(payload, local);
      }

      // PATCH
      const res = await api.patch("/candidates/me", payload);
      // Expect success -> 200 and updated candidate returned
      alert("Saved successfully");
      setEditingSection(null);
      setPhotoFile(null);
      setPhotoPreview(null);
      await fetchProfile();
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save. See console.");
    }
  }

  /* Photo upload — sends multipart/form-data to /candidates/me/photo
     (Adjust endpoint if your backend differs.) */
  async function uploadPhoto() {
    if (!photoFile) {
      alert("No photo selected");
      return;
    }
    try {
      const form = new FormData();
      form.append("photo", photoFile);
      const res = await api.post("/candidates/me/photo", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert("Photo uploaded");
      setPhotoFile(null);
      setPhotoPreview(null);
      await fetchProfile();
    } catch (err) {
      console.error("Photo upload error:", err);
      alert("Failed to upload photo. See console.");
    }
  }

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    const url = URL.createObjectURL(f);
    setPhotoPreview(url);
  }

  /* Password change */
  async function changePassword() {
    if (!pwdForm.currentPassword || !pwdForm.newPassword) {
      alert("Please fill both current and new password");
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      alert("Confirm password does not match");
      return;
    }
    try {
      // endpoint may differ — here assumed POST /users/me/password
      await api.post("/users/me/password", {
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword
      });
      alert("Password updated. Please re-login if required.");
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordModalOpen(false);
    } catch (err) {
      console.error("Password change error:", err);
      alert("Failed to change password. See console.");
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[320px]">
        <div className="text-center">
          <ArrowPathIcon className="animate-spin h-8 w-8 mx-auto text-gray-600" />
          <div className="mt-2 text-gray-600">Loading profile…</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="p-6">No profile data.</div>;
  }

  // helpers for booleans
  const verifications = [
    { key: "emailVerified", label: "Email", ok: !!profile.emailVerified },
    { key: "mobileVerified", label: "Mobile", ok: !!profile.mobileVerified },
    { key: "aadhaarVerified", label: "Aadhaar", ok: !!profile.aadhaarVerified },
    { key: "fatherMobileVerified", label: "Father Mobile", ok: !!profile.fatherMobileVerified },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto font-sans dark:bg-slate-900">
      <div className="bg-white rounded shadow-sm p-6 dark:bg-slate-900">
        <div className="flex flex-col lg:flex-row gap-6 dark:bg-slate-900">
          {/* Left column: avatar + basic */}
          <div className="w-full lg:w-1/3 flex flex-col items-center">
            <div className="relative">
              <img
                src={photoPreview || profile.photoUrl || "https://via.placeholder.com/180?text=No+Photo"}
                alt="profile"
                className="h-40 w-40 object-cover rounded-full border shadow-sm"
              />
              <div className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow ">
                <label className="cursor-pointer flex items-center gap-1 text-sm text-gray-700 dark:bg-indigo-800 dark:hover:bg-indigo-700" title="Edit photo">
                  <CameraIcon className="h-5 w-5" />
                  <input ref={fileInputRef} onChange={onFileChange} type="file" accept="image/*" className="hidden" />
                </label>
              </div>
            </div>

            <div className="mt-4 text-center dark:bg-slate-900">
              <div className="text-lg font-semibold">{profile.fullName || `${profile.firstName} ${profile.lastName}`}</div>
              <div className="text-sm text-gray-600">{profile.Designation || profile.userId?.role || "—"}</div>
              <div className="mt-2 flex flex-wrap gap-2 justify-center">
                {verifications.map(v => <Badge key={v.key} ok={v.ok} label={v.label} />)}
              </div>
            </div>

            <div className="mt-4 w-full flex gap-2 justify-center">
              {photoFile ? (
                <>
                  <button onClick={uploadPhoto} className="px-3 py-1 bg-green-600 text-white rounded flex items-center gap-2 dark:bg-indigo-800 dark:hover:bg-indigo-700">
                    <CheckIcon className="h-4 w-4" /> Upload
                  </button>
                  <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); fileInputRef.current.value = null; }} className="px-3 py-1 bg-gray-200 rounded flex items-center gap-2">
                    <XMarkIcon className="h-4 w-4" /> Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => fileInputRef.current.click()} className="px-3 py-1 bg-white border rounded flex items-center gap-2 dark:bg-red-800 dark:hover:bg-red-700">
                    <CameraIcon className="h-4 w-4" /> Edit Photo
                  </button>
                  <button onClick={() => setPasswordModalOpen(true)} className="px-3 py-1 bg-indigo-600 text-white rounded flex items-center gap-2">
                    <LockClosedIcon className="h-4 w-4" /> Change Password
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right column: sections */}
          <div className="w-full lg:w-2/3 space-y-4">
            {/* Header quick summary */}
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-gray-500">Employee ID</div>
                <div className="font-medium">{profile._id}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Status</div>
                <div className="font-medium capitalize">{profile.status || "—"}</div>
              </div>
            </div>

            {/* SECTION: Personal */}
            <div className="bg-gray-50 p-4 rounded dark:bg-slate-800 dark:text-gray-100">
              <div className="flex items-center justify-between mb-3 dark:text-gray-100">
                <div>
                  <div className="font-semibold">Personal</div>
                  <div className="text-xs text-gray-500">Name, DOB, Gender, marital status</div>
                </div>
                <div>
                  {editingSection === "personal" ? (
                    <div className="flex gap-2">
                      <button onClick={() => saveSection("personal")} className="px-3 py-1 bg-green-600 text-white rounded flex items-center gap-2"><CheckIcon className="h-4 w-4" /> Save</button>
                      <button onClick={cancelEdit} className="px-3 py-1 bg-gray-200 rounded flex items-center gap-2"><XMarkIcon className="h-4 w-4" /> Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit("personal")} className="px-2 py-1 bg-white border rounded flex items-center gap-2 text-sm dark:bg-indigo-800 dark:hover:bg-indigo-700"><PencilIcon className="h-4 w-4 " /> Edit</button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldRow label="First name" value={profile.firstName}>
                  {editingSection === "personal" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.firstName || ""} onChange={e => setLocal({...local, firstName: e.target.value})} />
                  ) : <div>{profile.firstName || "—"}</div>}
                </FieldRow>

                <FieldRow label="Last name" value={profile.lastName}>
                  {editingSection === "personal" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.lastName || ""} onChange={e => setLocal({...local, lastName: e.target.value})} />
                  ) : <div>{profile.lastName || "—"}</div>}
                </FieldRow>

                <FieldRow label="DOB" value={profile.dob}>
                  {editingSection === "personal" ? (
                    <input type="date" className="w-full px-2 py-1 border rounded" value={local.dob ? local.dob.split('T')[0] : ""} onChange={e => setLocal({...local, dob: e.target.value})} />
                  ) : <div>{profile.dob ? new Date(profile.dob).toLocaleDateString() : "—"}</div>}
                </FieldRow>

                <FieldRow label="Gender" value={profile.Gender}>
                  {editingSection === "personal" ? (
                    <select className="w-full px-2 py-1 border rounded" value={local.Gender || ""} onChange={e => setLocal({...local, Gender: e.target.value})}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  ) : <div className="capitalize">{profile.Gender || "—"}</div>}
                </FieldRow>

                <FieldRow label="Marital status" value={profile.isMarried ? "Married" : "Single"}>
                  {editingSection === "personal" ? (
                    <select className="w-full px-2 py-1 border rounded" value={local.isMarried ? "true" : "false"} onChange={e => setLocal({...local, isMarried: e.target.value === "true"})}>
                      <option value="false">Single</option>
                      <option value="true">Married</option>
                    </select>
                  ) : <div>{profile.isMarried ? "Married" : "Single"}</div>}
                </FieldRow>

                <FieldRow label="Spouse name" value={profile.spouseName}>
                  {editingSection === "personal" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.spouseName || ""} onChange={e => setLocal({...local, spouseName: e.target.value})} />
                  ) : <div>{profile.spouseName || "—"}</div>}
                </FieldRow>

                <FieldRow label="Spouse number" value={profile.spouseNumber}>
                  {editingSection === "personal" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.spouseNumber || ""} onChange={e => setLocal({...local, spouseNumber: e.target.value})} />
                  ) : <div>{profile.spouseNumber || "—"}</div>}
                </FieldRow>
              </div>
            </div>

            {/* SECTION: Contact */}
            <div className="bg-white p-4 rounded dark:bg-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold">Contact</div>
                  <div className="text-xs text-gray-500">Phone, email</div>
                </div>
                <div>
                  {editingSection === "contact" ? (
                    <div className="flex gap-2">
                      <button onClick={() => saveSection("contact")} className="px-3 py-1 bg-green-600 text-white rounded flex items-center gap-2"><CheckIcon className="h-4 w-4" /> Save</button>
                      <button onClick={cancelEdit} className="px-3 py-1 bg-gray-200 rounded flex items-center gap-2"><XMarkIcon className="h-4 w-4" /> Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit("contact")} className="px-2 py-1 bg-white border rounded flex items-center gap-2 text-sm dark:bg-indigo-800 dark:hover:bg-indigo-700"><PencilIcon className="h-4 w-4" /> Edit</button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldRow label="Mobile" value={profile.mobile}>
                  {editingSection === "contact" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.mobile || ""} onChange={e => setLocal({...local, mobile: e.target.value})} />
                  ) : <div>{profile.mobile || "—"}</div>}
                </FieldRow>

                <FieldRow label="Alternate mobile" value={profile.AlternativeMobile}>
                  {editingSection === "contact" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.AlternativeMobile || ""} onChange={e => setLocal({...local, AlternativeMobile: e.target.value})} />
                  ) : <div>{profile.AlternativeMobile || "—"}</div>}
                </FieldRow>

                <FieldRow label="Email" value={profile.email}>
                  {editingSection === "contact" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.email || ""} onChange={e => setLocal({...local, email: e.target.value})} />
                  ) : <div>{profile.email || "—"}</div>}
                </FieldRow>

                <FieldRow label="Blood group" value={profile.BloodGroup}>
                  {editingSection === "contact" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.BloodGroup || ""} onChange={e => setLocal({...local, BloodGroup: e.target.value})} />
                  ) : <div>{profile.BloodGroup || "—"}</div>}
                </FieldRow>
              </div>
            </div>

            {/* SECTION: Employment */}
            <div className="bg-gray-50 p-4 rounded dark:bg-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold">Employment</div>
                  <div className="text-xs text-gray-500">Designation, salary, joining date</div>
                </div>
                <div>
                  {editingSection === "employment" ? (
                    <div className="flex gap-2">
                      <button onClick={() => saveSection("employment")} className="px-3 py-1 bg-green-600 text-white rounded flex items-center gap-2"><CheckIcon className="h-4 w-4" /> Save</button>
                      <button onClick={cancelEdit} className="px-3 py-1 bg-gray-200 rounded flex items-center gap-2"><XMarkIcon className="h-4 w-4" /> Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit("employment")} className="px-2 py-1 bg-white border rounded flex items-center gap-2 text-sm dark:bg-indigo-800 dark:hover:bg-indigo-700"><PencilIcon className="h-4 w-4" /> Edit</button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldRow label="Designation" value={profile.Designation}>
                  {editingSection === "employment" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.Designation || ""} onChange={e => setLocal({...local, Designation: e.target.value})} />
                  ) : <div>{profile.Designation || "—"}</div>}
                </FieldRow>

                <FieldRow label="Department" value={profile.department}>
                  {editingSection === "employment" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.department || ""} onChange={e => setLocal({...local, department: e.target.value})} />
                  ) : <div>{profile.department || "—"}</div>}
                </FieldRow>

                <FieldRow label="Salary" value={profile.Salary}>
                  {editingSection === "employment" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.Salary || ""} onChange={e => setLocal({...local, Salary: e.target.value})} />
                  ) : <div>{profile.Salary ? `₹ ${profile.Salary}` : "—"}</div>}
                </FieldRow>

                <FieldRow label="Next increment" value={profile.NextIncreament}>
                  {editingSection === "employment" ? (
                    <div className="flex gap-2">
                      <input className="px-2 py-1 border rounded w-32" value={local.NextIncreament || ""} onChange={e => setLocal({...local, NextIncreament: e.target.value})} />
                      <input type="date" className="px-2 py-1 border rounded" value={local.NextIncreamentDate ? new Date(local.NextIncreamentDate).toISOString().slice(0,10) : ""} onChange={e => setLocal({...local, NextIncreamentDate: e.target.value})} />
                    </div>
                  ) : <div>{profile.NextIncreament ? `${profile.NextIncreament} on ${profile.NextIncreamentDate}` : "—"}</div>}
                </FieldRow>

                <FieldRow label="Date of joining" value={profile.DateOfJoining}>
                  {editingSection === "employment" ? (
                    <input type="date" className="w-full px-2 py-1 border rounded" value={local.DateOfJoining ? new Date(local.DateOfJoining).toISOString().slice(0,10) : ""} onChange={e => setLocal({...local, DateOfJoining: e.target.value})} />
                  ) : <div>{profile.DateOfJoining ? new Date(profile.DateOfJoining).toLocaleDateString() : "—"}</div>}
                </FieldRow>
              </div>
            </div>

            {/* SECTION: IDs */}
            <div className="bg-white p-4 rounded dark:bg-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold">IDs & Policies</div>
                  <div className="text-xs text-gray-500">Aadhaar, PAN, Driving Licence, PF, ESIC</div>
                </div>
                <div>
                  {editingSection === "ids" ? (
                    <div className="flex gap-2">
                      <button onClick={() => saveSection("ids")} className="px-3 py-1 bg-green-600 text-white rounded flex items-center gap-2"><CheckIcon className="h-4 w-4" /> Save</button>
                      <button onClick={cancelEdit} className="px-3 py-1 bg-gray-200 rounded flex items-center gap-2"><XMarkIcon className="h-4 w-4" /> Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit("ids")} className="px-2 py-1 bg-white border rounded flex items-center gap-2 dark:bg-indigo-800  dark:hover:bg-indigo-700 text-sm"><PencilIcon className="h-4 w-4" /> Edit</button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FieldRow label="Aadhaar" value={profile.aadhaarNumber}>
                  {editingSection === "ids" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.aadhaarNumber || ""} onChange={e => setLocal({...local, aadhaarNumber: e.target.value})} />
                  ) : <div>{profile.aadhaarNumber || "—"}</div>}
                </FieldRow>

                <FieldRow label="PAN" value={profile.panNumber}>
                  {editingSection === "ids" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.panNumber || ""} onChange={e => setLocal({...local, panNumber: e.target.value})} />
                  ) : <div>{profile.panNumber || "—"}</div>}
                </FieldRow>

                <FieldRow label="Driving License" value={profile.drivingLicenseNumber}>
                  {editingSection === "ids" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.drivingLicenseNumber || ""} onChange={e => setLocal({...local, drivingLicenseNumber: e.target.value})} />
                  ) : <div>{profile.drivingLicenseNumber || "—"}</div>}
                </FieldRow>

                <FieldRow label="PF Number" value={profile.pfNumber}>
                  {editingSection === "ids" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.pfNumber || ""} onChange={e => setLocal({...local, pfNumber: e.target.value})} />
                  ) : <div>{profile.pfNumber || "—"}</div>}
                </FieldRow>

                <FieldRow label="ESIC Number" value={profile.esicNumber}>
                  {editingSection === "ids" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.esicNumber || ""} onChange={e => setLocal({...local, esicNumber: e.target.value})} />
                  ) : <div>{profile.esicNumber || "—"}</div>}
                </FieldRow>

                <FieldRow label="Medical policy" value={profile.medicalPolicyNumber}>
                  {editingSection === "ids" ? (
                    <input className="w-full px-2 py-1 border rounded" value={local.medicalPolicyNumber || ""} onChange={e => setLocal({...local, medicalPolicyNumber: e.target.value})} />
                  ) : <div>{profile.medicalPolicyNumber || "—"}</div>}
                </FieldRow>
              </div>
            </div>

            {/* SECTION: Address */}
            <div className="bg-gray-50 p-4 rounded dark:bg-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold">Address</div>
                  <div className="text-xs text-gray-500">Current & Permanent</div>
                </div>
                <div>
                  {editingSection === "address" ? (
                    <div className="flex gap-2">
                      <button onClick={() => saveSection("address")} className="px-3 py-1 bg-green-600 text-white rounded flex items-center gap-2"><CheckIcon className="h-4 w-4" /> Save</button>
                      <button onClick={cancelEdit} className="px-3 py-1 bg-gray-200 rounded flex items-center gap-2"><XMarkIcon className="h-4 w-4" /> Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit("address")} className="px-2 py-1 bg-white border rounded flex items-center gap-2 text-sm dark:bg-indigo-800 dark:hover:bg-indigo-700"><PencilIcon className="h-4 w-4" /> Edit</button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-white rounded">
                  <div className="text-xs text-gray-500 mb-2">Current Address</div>
                  <div className="text-sm">
                    {editingSection === "address" ? (
                      <>
                        <input className="w-full px-2 py-1 mb-2 border rounded" placeholder="Line 1" value={local.address?.current?.line1 || ""} onChange={e => setLocal({...local, address: {...local.address, current: {...local.address?.current, line1: e.target.value}}})} />
                        <input className="w-full px-2 py-1 mb-2 border rounded" placeholder="Line 2" value={local.address?.current?.line2 || ""} onChange={e => setLocal({...local, address: {...local.address, current: {...local.address?.current, line2: e.target.value}}})} />
                        <div className="flex gap-2">
                          <input className="flex-1 px-2 py-1 border rounded" placeholder="City" value={local.address?.current?.city || ""} onChange={e => setLocal({...local, address: {...local.address, current: {...local.address?.current, city: e.target.value}}})} />
                          <input className="w-28 px-2 py-1 border rounded" placeholder="Pincode" value={local.address?.current?.pincode || ""} onChange={e => setLocal({...local, address: {...local.address, current: {...local.address?.current, pincode: e.target.value}}})} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>{profile.address?.current?.line1}</div>
                        <div className="text-sm text-gray-600">{profile.address?.current?.line2}</div>
                        <div className="text-xs text-gray-500">{profile.address?.current?.city}, {profile.address?.current?.state} • {profile.address?.current?.pincode}</div>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-white rounded">
                  <div className="text-xs text-gray-500 mb-2">Permanent Address</div>
                  <div className="text-sm">
                    {editingSection === "address" ? (
                      <>
                        <input className="w-full px-2 py-1 mb-2 border rounded" placeholder="Line 1" value={local.address?.permanent?.line1 || ""} onChange={e => setLocal({...local, address: {...local.address, permanent: {...local.address?.permanent, line1: e.target.value}}})} />
                        <input className="w-full px-2 py-1 mb-2 border rounded" placeholder="Line 2" value={local.address?.permanent?.line2 || ""} onChange={e => setLocal({...local, address: {...local.address, permanent: {...local.address?.permanent, line2: e.target.value}}})} />
                        <div className="flex gap-2">
                          <input className="flex-1 px-2 py-1 border rounded" placeholder="City" value={local.address?.permanent?.city || ""} onChange={e => setLocal({...local, address: {...local.address, permanent: {...local.address?.permanent, city: e.target.value}}})} />
                          <input className="w-28 px-2 py-1 border rounded" placeholder="Pincode" value={local.address?.permanent?.pincode || ""} onChange={e => setLocal({...local, address: {...local.address, permanent: {...local.address?.permanent, pincode: e.target.value}}})} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>{profile.address?.permanent?.line1}</div>
                        <div className="text-sm text-gray-600">{profile.address?.permanent?.line2}</div>
                        <div className="text-xs text-gray-500">{profile.address?.permanent?.city}, {profile.address?.permanent?.state} • {profile.address?.permanent?.pincode}</div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2 items-center">
                <div className="text-xs text-gray-500">Permanent same as current</div>
                <div className="text-sm">{profile.address?.isPermanentSameAsCurrent ? "Yes" : "No"}</div>
                <div className="ml-auto text-xs text-gray-500">PG: {profile.address?.isPG ? "Yes" : "No"}</div>
              </div>
            </div>

            {/* SECTION: Documents */}
            <div className="bg-white p-4 rounded dark:bg-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold">Documents</div>
                  <div className="text-xs text-gray-500">Uploaded files</div>
                </div>
                <div>
                  <button onClick={() => alert("Upload flow placeholder — wire to file upload endpoint")} className="px-2 py-1 bg-white border rounded text-sm flex items-center gap-2 dark:bg-indigo-800 dark:hover:bg-indigo-700"><DocumentIcon className="h-4 w-4 dark:bg-indigo-800 dark:hover:bg-indigo-700" /> Upload</button>
                </div>
              </div>

              <div className="grid gap-2">
                {profile.documents && profile.documents.length > 0 ? (
                  profile.documents.map((doc, idx) => (
                    <div key={idx} className="p-3 border rounded flex items-center justify-between bg-gray-50">
                      <div className="flex items-center gap-3">
                        <DocumentIcon className="h-6 w-6 text-gray-600" />
                        <div>
                          <div className="text-sm font-medium">{doc.name || `Doc ${idx+1}`}</div>
                          <div className="text-xs text-gray-500">{doc.type || "file"}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a href={doc.url || "#"} target="_blank" rel="noreferrer" className="text-sm text-indigo-600">Open</a>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500 p-3">No documents uploaded.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded p-4 w-full max-w-md shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Change password</div>
              <button onClick={() => setPasswordModalOpen(false)} className="text-sm text-gray-600">Close</button>
            </div>

            <div className="space-y-2">
              <input type="password" placeholder="Current password" value={pwdForm.currentPassword} onChange={e => setPwdForm({...pwdForm, currentPassword: e.target.value})} className="w-full px-2 py-1 border rounded" />
              <input type="password" placeholder="New password" value={pwdForm.newPassword} onChange={e => setPwdForm({...pwdForm, newPassword: e.target.value})} className="w-full px-2 py-1 border rounded" />
              <input type="password" placeholder="Confirm new password" value={pwdForm.confirmPassword} onChange={e => setPwdForm({...pwdForm, confirmPassword: e.target.value})} className="w-full px-2 py-1 border rounded" />
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setPasswordModalOpen(false)} className="px-3 py-1 bg-gray-200 rounded dark:bg-red-800 dark:hover:bg-red-700">Cancel</button>
              <button onClick={changePassword} className="px-3 py-1 bg-indigo-600 text-white rounded dark:bg-indigo-800 dark:hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
