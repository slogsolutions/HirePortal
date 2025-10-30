import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Modal from "../components/Modal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Validators
const validateField = (field, value) => {
  const optionalFields = [
    "Designation",
    "NextIncreament",
    "NextIncreamentDate",
    "AlternativeMobile",
    "panNumber",
    "drivingLicenseNumber",
    "pfNumber",
    "esicNumber",
    "medicalPolicyNumber",
    "status",
    "departmentOther",
  ];
  if (!value && !optionalFields.includes(field)) {
    return "This field is required";
  }
  if (field === "email" && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Invalid email";
  }
  if (
    (field === "mobile" ||
      field === "fatherMobile" ||
      field === "spouseNumber" ||
      field === "AlternativeMobile") &&
    value &&
    !/^\d{10}$/.test(String(value))
  )
    return "Must be 10 digits";
  if (field === "aadhaarNumber" && value && !/^\d{12}$/.test(String(value)))
    return "Must be 12 digits";
  if (field === "password" && value) {
    // basic password rule: min 6 chars (adjust as needed)
    if (String(value).length < 6) return "Password must be at least 6 characters";
  }
  return "";
};

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const departments = [
  "HR",
  "IT",
  "Management",
  "Marketing",
  "Finance",
  "Sales",
  "Operations",
  "Support",
  "R&D",
  "Admin",
  "Legal",
  "Other",
];

const roles = ["hr", "employee", "admin", "manager"];

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const navigate = useNavigate();

  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/candidates");
      setCandidates(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to load");
      console.error("fetchCandidates error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const saveCandidate = async (payload) => {
    if (payload._id) {
      const res = await api.put(`/candidates/${payload._id}`, payload);
      setCandidates((cur) => cur.map((c) => (c._id === res.data._id ? res.data : c)));
      return res.data;
    } else {
      const res = await api.post("/candidates", payload);
      setCandidates((cur) => [res.data, ...cur]);
      return res.data;
    }
  };

  function CandidateForm({ initial = {}, onCancel }) {
    // toggle this to true to show payload/errors debug UI and extra console logs
    const debug = false;

    const emptyAddress = { line1: "", line2: "", city: "", state: "", pincode: "" };

    // Build canonical initial object (avoid undefined shape)
    const canonicalInitial = {
      _id: initial._id || undefined,
      firstName: initial.firstName || "",
      lastName: initial.lastName || "",
      email: initial.email || "",
      mobile: initial.mobile || "",
      AlternativeMobile: initial.AlternativeMobile || "",
      fatherName: initial.fatherName || "",
      fatherMobile: initial.fatherMobile || "",
      MotherName: initial.MotherName || "",
      dob: initial.dob ? new Date(initial.dob) : null,
      Gender: initial.Gender || "",
      BloodGroup: initial.BloodGroup || "",
      department: initial.department || "",
      departmentOther: initial.departmentOther || "",
      Designation: initial.Designation || "",
      Salary: initial.Salary || "",
      NextIncreament: initial.NextIncreament || "",
      NextIncreamentDate: initial.NextIncreamentDate ? new Date(initial.NextIncreamentDate) : null,
      DateOfJoining: initial.DateOfJoining ? new Date(initial.DateOfJoining) : null,
      isMarried: !!initial.isMarried,
      spouseName: initial.spouseName || "",
      spouseNumber: initial.spouseNumber || "",
      address: {
        current: initial.address?.current || { ...emptyAddress },
        permanent: initial.address?.permanent || { ...emptyAddress },
        isPermanentSameAsCurrent: initial.address?.isPermanentSameAsCurrent || false,
        isPG: initial.address?.isPG || false,
        pgOwnerName: initial.address?.pgOwnerName || "",
        pgName: initial.address?.pgName || "",
        pgNumber: initial.address?.pgNumber || "",
      },
      aadhaarNumber: initial.aadhaarNumber || "",
      panNumber: initial.panNumber || "",
      drivingLicenseNumber: initial.drivingLicenseNumber || "",
      pfNumber: initial.pfNumber || "",
      esicNumber: initial.esicNumber || "",
      medicalPolicyNumber: initial.medicalPolicyNumber || "",
      status: initial.status || "applied",
      photoUrl: initial.photoUrl || "",
      // NEW FIELDS
      password: "",
      confirmPassword: "",
      role: initial.role || "employee",
    };

    const [form, setForm] = useState(canonicalInitial);
    const [errors, setErrors] = useState({});
    const [selectedFile, setSelectedFile] = useState(null);
    const [localPreview, setLocalPreview] = useState(canonicalInitial.photoUrl || null);
    const fileRef = useRef(null);

    // When editing prop changes, reset to canonical initial
    useEffect(() => {
      const ci = {
        ...canonicalInitial,
        dob: initial.dob ? new Date(initial.dob) : null,
        DateOfJoining: initial.DateOfJoining ? new Date(initial.DateOfJoining) : null,
        NextIncreamentDate: initial.NextIncreamentDate ? new Date(initial.NextIncreamentDate) : null,
        address: initial.address || canonicalInitial.address,
        // if editing existing user and password isn't provided, keep empty
        password: "",
        confirmPassword: "",
        role: initial.role || canonicalInitial.role,
      };
      setForm(ci);
      setSelectedFile(null);
      setLocalPreview(ci.photoUrl || null);
      setErrors({});
      if (debug) console.debug("CandidateForm init:", ci);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial]);

    useEffect(() => {
      let url;
      if (selectedFile) {
        url = URL.createObjectURL(selectedFile);
        setLocalPreview(url);
      }
      return () => {
        if (url) URL.revokeObjectURL(url);
      };
    }, [selectedFile]);

    // DYNAMIC PASSWORD MATCH VALIDATION:
    // whenever password or confirmPassword changes, update the errors for both fields
    useEffect(() => {
      setErrors((prev) => {
        const next = { ...prev };
        // don't override password's own other validation (like min-length) unless mismatch
        const passwordHasLengthError = validateField("password", form.password);

        if (form.password || form.confirmPassword) {
          if (form.password !== form.confirmPassword) {
            // set mismatch error on both fields (so user sees it under either)
            next.password = passwordHasLengthError || "Passwords do not match";
            next.confirmPassword = "Passwords do not match";
          } else {
            // passwords match: clear mismatch errors but preserve other password error (like length)
            if (next.confirmPassword === "Passwords do not match") delete next.confirmPassword;
            if (next.password === "Passwords do not match") {
              if (passwordHasLengthError) next.password = passwordHasLengthError;
              else delete next.password;
            }
          }
        } else {
          // neither provided: remove confirmPassword mismatch if present; leave other errors untouched
          if (next.confirmPassword === "Passwords do not match") delete next.confirmPassword;
        }
        return next;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.password, form.confirmPassword]);

    const handleChange = (field, value) => {
      setForm((f) => ({ ...f, [field]: value }));
      // run per-field validation immediately (same behavior as other fields)
      setErrors((e) => ({ ...e, [field]: validateField(field, value) }));
    };

    const handleAddressChange = (key, value, type = "current") => {
      setForm((f) => ({
        ...f,
        address: { ...(f.address || {}), [type]: { ...(f.address?.[type] || {}), [key]: value } },
      }));
      // Address-level validation (inline)
      setErrors((e) => ({ ...e, [`address.${type}.${key}`]: value ? "" : "Required" }));
    };

    const chooseFile = () => fileRef.current?.click();
    const onFileChange = (e) => {
      const f = e.target.files?.[0];
      if (f) setSelectedFile(f);
    };
    const clearFile = () => {
      setSelectedFile(null);
      setLocalPreview(form.photoUrl || null);
      if (fileRef.current) fileRef.current.value = "";
    };
    const resetAll = () => {
      setForm({ ...canonicalInitial });
      setSelectedFile(null);
      setLocalPreview(canonicalInitial.photoUrl || null);
      setErrors({});
      if (debug) console.debug("resetAll -> form:", canonicalInitial);
    };

    const copyPermanent = (checked) => {
      if (!checked || !form.address?.current) {
        // still set the flag so checkbox state is consistent
        setForm((f) => ({ ...f, address: { ...(f.address || {}), isPermanentSameAsCurrent: !!checked } }));
        return;
      }
      const current = form.address.current;
      setForm((f) => ({ ...f, address: { ...(f.address || {}), permanent: { ...current }, isPermanentSameAsCurrent: checked } }));
    };

    // Explicit required fields list (avoids validating nested objects wrongly)
    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "mobile",
      "Gender",
      "BloodGroup",
      "department",
      // removed "password" from here so password is NOT required on edit
      "role",
    ];

    const validateForm = () => {
      const newErrors = {};

      // required simple fields
      requiredFields.forEach((f) => {
        // if department === Other, departmentOther is required
        if (f === "department" && form.department === "Other") {
          newErrors.departmentOther = validateField("departmentOther", form.departmentOther);
        }
        newErrors[f] = validateField(f, form[f]);
      });

      // Password is only required when creating a new candidate (form._id is falsy)
      if (!form._id) {
        // creating -> password required
        newErrors.password = validateField("password", form.password);
      } else {
        // editing -> only validate password if provided (validateField already handles min length)
        if (form.password) newErrors.password = validateField("password", form.password);
      }

      // confirmPassword check (client-side only)
      if (form.password || form.confirmPassword) {
        if (form.password !== form.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match";
          // also set password mismatch if there's no other password error
          if (!newErrors.password) newErrors.password = "Passwords do not match";
        }
      }

      // dates are optional but if provided, make sure they're valid Date objects
      ["dob", "DateOfJoining", "NextIncreamentDate"].forEach((d) => {
        if (form[d] && !(form[d] instanceof Date && !isNaN(form[d].getTime()))) {
          newErrors[d] = "Invalid date";
        }
      });

      // address fields required
      if (form.address) {
        ["current", "permanent"].forEach((type) => {
          ["line1", "city", "state", "pincode"].forEach((k) => {
            // pincode may be optional for some flows, but keep required here per your original
            if (!form.address[type]?.[k]) newErrors[`address.${type}.${k}`] = "Required";
          });
        });
      }

      // validate id fields individually
      ["aadhaarNumber", "panNumber", "drivingLicenseNumber", "pfNumber", "esicNumber", "medicalPolicyNumber", "AlternativeMobile", "fatherMobile"].forEach((f) => {
        const val = form[f];
        if (val) newErrors[f] = validateField(f, val);
      });

      setErrors(newErrors);
      const ok = Object.keys(newErrors).every((k) => !newErrors[k]);
      if (debug) {
        console.debug("validateForm -> newErrors:", newErrors, "result:", ok);
      }
      return ok;
    };

    const submit = async (e) => {
      e.preventDefault();
      if (debug) console.debug("submit clicked, form:", form);

      if (!validateForm()) {
        if (debug) console.warn("Validation failed, errors:", errors);
        // show a short alert so user notices
        alert("Please fix validation errors (see highlighted fields).");
        return;
      }

      // Prepare payload: convert Date objects to ISO strings
      const payload = {
        ...form,
        dob: form.dob ? form.dob.toISOString() : undefined,
        DateOfJoining: form.DateOfJoining ? form.DateOfJoining.toISOString() : undefined,
        NextIncreamentDate: form.NextIncreamentDate ? form.NextIncreamentDate.toISOString() : undefined,
        // ensure address shape
        address: {
          ...form.address,
          current: { ...(form.address?.current || emptyAddress) },
          permanent: { ...(form.address?.permanent || emptyAddress) },
        },
      };

      // If department === Other, send departmentOther value as department (keeps your previous behavior)
      if (payload.department === "Other") payload.department = payload.departmentOther;

      // Only send password (omit confirmPassword)
      if (payload.confirmPassword !== undefined) delete payload.confirmPassword;

      // IMPORTANT: Do not send an empty password field on edit. If password is empty or falsy, remove it.
      if (!payload.password) {
        delete payload.password;
      }

      // Make sure role is present (it is part of payload by default)
      // payload.role is already set from form.role

      if (debug) console.debug("Prepared payload for API:", payload);
      try {
        console.info("Saving candidate...");
        const saved = await saveCandidate(payload);
        console.info("Saved candidate:", saved);
        if (selectedFile) {
          try {
            const fd = new FormData();
            fd.append("photo", selectedFile);
            console.info("Uploading photo...");
            const res = await api.post(`/candidates/${saved._id}/photo`, fd, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            console.info("Photo uploaded:", res.data);
          } catch (photoErr) {
            console.error("photo upload error:", photoErr);
            alert("Candidate saved but photo upload failed. See console for details.");
          }
        }
        setModalOpen(false);
        setEditing(null);
        // refresh list
        fetchCandidates();
      } catch (err) {
        console.error("submit error:", err);
        alert(err?.response?.data?.message || "Save failed - see console for details");
      }
    };

    return (
      <form onSubmit={submit} className="space-y-4 max-h-[80vh] overflow-y-auto">
        {/* debug summary (visible only when debug===true) */}
        {debug && (
          <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs text-yellow-800">
            <div className="font-semibold text-sm mb-1">DEBUG (visible in UI)</div>
            <div className="text-xs"><strong>Errors:</strong> {Object.keys(errors).length ? JSON.stringify(errors) : "none"}</div>
            <div className="text-xs mt-1"><strong>Sample payload preview:</strong> {JSON.stringify({
              firstName: form.firstName,
              lastName: form.lastName,
              email: form.email,
              mobile: form.mobile,
              dob: form.dob ? form.dob.toISOString().slice(0,10) : null,
              DateOfJoining: form.DateOfJoining ? form.DateOfJoining.toISOString().slice(0,10) : null,
            })}</div>
          </div>
        )}

        {/* Photo */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full overflow-hidden border bg-gray-100 flex items-center justify-center">
            {localPreview ? <img src={localPreview} alt="preview" className="w-full h-full object-cover" /> : <div className="text-gray-400">No photo</div>}
          </div>
          <div className="flex gap-2 items-center">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <button type="button" onClick={chooseFile} className="px-3 py-1 border rounded">Choose Photo</button>
            <button type="button" onClick={clearFile} className="px-3 py-1 border rounded">Reset Image</button>
            <button type="button" onClick={resetAll} className="px-3 py-1 border rounded">Reset All</button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {["firstName", "lastName", "email", "mobile", "AlternativeMobile", "fatherName", "fatherMobile", "MotherName", "Designation", "Salary"].map((key) => (
            <div key={key}>
              <label className="text-xs text-gray-500">{key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}</label>
              <input
                type="text"
                value={form[key] || ""}
                onChange={(e) => handleChange(key, e.target.value)}
                className={`w-full border rounded px-3 py-2 text-sm ${errors[key] ? "border-red-500" : ""}`}
              />
              {errors[key] && <div className="text-red-500 text-xs mt-1">{errors[key]}</div>}
            </div>
          ))}

          <div>
            <label className="text-xs text-gray-500">Gender</label>
            <select value={form.Gender || ""} onChange={(e) => handleChange("Gender", e.target.value)} className={`w-full border rounded px-3 py-2 text-sm ${errors.Gender ? "border-red-500" : ""}`}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
            {errors.Gender && <div className="text-red-500 text-xs mt-1">{errors.Gender}</div>}
          </div>

          <div>
            <label className="text-xs text-gray-500">Blood Group</label>
            <select value={form.BloodGroup || ""} onChange={(e) => handleChange("BloodGroup", e.target.value)} className={`w-full border rounded px-3 py-2 text-sm ${errors.BloodGroup ? "border-red-500" : ""}`}>
              <option value="">Select</option>
              {bloodGroups.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            {errors.BloodGroup && <div className="text-red-500 text-xs mt-1">{errors.BloodGroup}</div>}
          </div>

          <div>
            <label className="text-xs text-gray-500">Department</label>
            <select value={form.department || ""} onChange={(e) => handleChange("department", e.target.value)} className={`w-full border rounded px-3 py-2 text-sm ${errors.department ? "border-red-500" : ""}`}>
              <option value="">Select</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {form.department === "Other" && <input type="text" placeholder="Enter department" value={form.departmentOther || ""} onChange={(e) => handleChange("departmentOther", e.target.value)} className="mt-1 w-full border rounded px-3 py-2 text-sm" />}
            {errors.department && <div className="text-red-500 text-xs mt-1">{errors.department}</div>}
            {errors.departmentOther && <div className="text-red-500 text-xs mt-1">{errors.departmentOther}</div>}
          </div>
        </div>

        {/* NEW: Password & Role */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500">Password</label>
            <input
              type="password"
              value={form.password || ""}
              onChange={(e) => handleChange("password", e.target.value)}
              className={`w-full border rounded px-3 py-2 text-sm ${errors.password ? "border-red-500" : ""}`}
              placeholder={form._id ? "Leave blank to keep existing password" : "Enter password"}
            />
            {errors.password && <div className="text-red-500 text-xs mt-1">{errors.password}</div>}
          </div>

          <div>
            <label className="text-xs text-gray-500">Confirm Password</label>
            <input
              type="password"
              value={form.confirmPassword || ""}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              className={`w-full border rounded px-3 py-2 text-sm ${errors.confirmPassword ? "border-red-500" : ""}`}
            />
            {errors.confirmPassword && <div className="text-red-500 text-xs mt-1">{errors.confirmPassword}</div>}
          </div>

          <div>
            <label className="text-xs text-gray-500">Role</label>
            <select
              value={form.role || "employee"}
              onChange={(e) => handleChange("role", e.target.value)}
              className={`w-full border rounded px-3 py-2 text-sm ${errors.role ? "border-red-500" : ""}`}
            >
              <option value="">Select Role</option>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {errors.role && <div className="text-red-500 text-xs mt-1">{errors.role}</div>}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500">Date of Birth</label>
            <DatePicker selected={form.dob} onChange={(date) => handleChange("dob", date)} className={`w-full border rounded px-3 py-2 text-sm ${errors.dob ? "border-red-500" : ""}`} />
            {errors.dob && <div className="text-red-500 text-xs mt-1">{errors.dob}</div>}
          </div>

          <div>
            <label className="text-xs text-gray-500">Date of Joining</label>
            <DatePicker selected={form.DateOfJoining} onChange={(date) => handleChange("DateOfJoining", date)} className={`w-full border rounded px-3 py-2 text-sm ${errors.DateOfJoining ? "border-red-500" : ""}`} />
            {errors.DateOfJoining && <div className="text-red-500 text-xs mt-1">{errors.DateOfJoining}</div>}
          </div>

          {/* Next Increment string + date grouped */}
          <div>
            <label className="text-xs text-gray-500">Next Increment (note)</label>
            <input type="text" value={form.NextIncreament || ""} onChange={(e) => handleChange("NextIncreament", e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="E.g., 10% / performance based" />
            <div className="mt-2">
              <label className="text-xs text-gray-500">Next Increment Date</label>
              <DatePicker selected={form.NextIncreamentDate} onChange={(date) => handleChange("NextIncreamentDate", date)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
          </div>
        </div>

        {/* Marital */}
        <div className="flex items-center gap-2 mt-2">
          <input type="checkbox" checked={!!form.isMarried} onChange={(e) => handleChange("isMarried", e.target.checked)} />
          <label>Married</label>
        </div>
        {form.isMarried && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">Spouse Name</label>
              <input type="text" value={form.spouseName || ""} onChange={(e) => handleChange("spouseName", e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Spouse Number</label>
              <input type="text" value={form.spouseNumber || ""} onChange={(e) => handleChange("spouseNumber", e.target.value)} className={`w-full border rounded px-3 py-2 text-sm ${errors.spouseNumber ? "border-red-500" : ""}`} />
              {errors.spouseNumber && <div className="text-red-500 text-xs mt-1">{errors.spouseNumber}</div>}
            </div>
          </div>
        )}

        {/* Address & PG */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {["current", "permanent"].map((type) => (
            <div key={type}>
              <h3 className="text-sm font-semibold">{type === "current" ? "Current Address" : "Permanent Address"}</h3>
              {["line1", "line2", "city", "state", "pincode"].map((f) => (
                <div key={f}>
                  <label className="text-xs text-gray-500">{f}</label>
                  <input
                    type="text"
                    value={form.address?.[type]?.[f] || ""}
                    onChange={(e) => handleAddressChange(f, e.target.value, type)}
                    className={`w-full border rounded px-3 py-2 text-sm ${errors[`address.${type}.${f}`] ? "border-red-500" : ""}`}
                  />
                  {errors[`address.${type}.${f}`] && <div className="text-red-500 text-xs mt-1">{errors[`address.${type}.${f}`]}</div>}
                </div>
              ))}
              {type === "permanent" && (
                <div className="flex items-center gap-2 mt-1">
                  <input type="checkbox" checked={!!form.address?.isPermanentSameAsCurrent} onChange={(e) => copyPermanent(e.target.checked)} />
                  <label>Same as Current Address</label>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <input type="checkbox" checked={!!form.address?.isPG} onChange={(e) => setForm((f) => ({ ...f, address: { ...(f.address || {}), isPG: e.target.checked } }))} />
          <label>PG / Rent</label>
        </div>
        {form.address?.isPG && (
          <div className="space-y-2">
            {["pgOwnerName", "pgName", "pgNumber"].map((f) => (
              <div key={f}>
                <label className="text-xs text-gray-500">{f}</label>
                <input type="text" value={form.address?.[f] || ""} onChange={(e) => setForm((fm) => ({ ...fm, address: { ...(fm.address || {}), [f]: e.target.value } }))} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            ))}
          </div>
        )}

        {/* IDs & Policies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {["aadhaarNumber", "panNumber", "drivingLicenseNumber", "pfNumber", "esicNumber", "medicalPolicyNumber"].map((f) => (
            <div key={f}>
              <label className="text-xs text-gray-500">{f}</label>
              <input type="text" value={form[f] || ""} onChange={(e) => handleChange(f, e.target.value)} className={`w-full border rounded px-3 py-2 text-sm ${errors[f] ? "border-red-500" : ""}`} />
              {errors[f] && <div className="text-red-500 text-xs mt-1">{errors[f]}</div>}
            </div>
          ))}

          <div>
            <label className="text-xs text-gray-500">Status</label>
            <input type="text" value={form.status || ""} onChange={(e) => handleChange("status", e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <button type="button" onClick={onCancel} className="px-3 py-2 border rounded">Cancel</button>
          <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded">{form._id ? "Save" : "Create"}</button>
        </div>
      </form>
    );
  }

  const handleDelete = async (id) => {
    if (!confirm("Delete candidate?")) return;
    try {
      await api.delete(`/candidates/${id}`);
      setCandidates((cur) => cur.filter((c) => c._id !== id));
    } catch (err) {
      console.error("delete error:", err);
      alert(err?.response?.data?.message || "Delete failed");
    }
  };

  const renderRow = (c) => (
    <div key={c._id} className="flex items-center gap-4 p-4 md:p-6 border-b last:border-b-0 bg-white dark:bg-gray-800">
      <div className="flex-shrink-0">
        <button onClick={() => setAvatarPreview(c.photoUrl || null)} className="w-14 h-14 rounded-full overflow-hidden border">
          {c.photoUrl ? <img src={c.photoUrl} alt={c.firstName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-100">{(c.firstName?.[0] || "?").toUpperCase()}</div>}
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-md font-semibold">{(c.firstName || "") + " " + (c.lastName || "")}</div>
        <div className="text-sm text-gray-500">{c.email || "-"} • {c.mobile || "-"}</div>
        <div className="text-sm text-gray-500">{c.Designation || "-"} | {c.department || "-"}</div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <button onClick={() => { setEditing(c); setModalOpen(true); }} className="px-3 py-2 border rounded text-sm">Edit</button>
        <button onClick={() => handleDelete(c._id)} className="px-3 py-2 bg-red-600 text-white rounded text-sm">Delete</button>
        <button onClick={() => navigate(`/candidates/${c._id}`)} className="px-3 py-2 bg-indigo-600 text-white rounded text-sm">Details</button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Candidates</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="px-4 py-2 bg-emerald-600 text-white rounded">+ Add Candidate</button>
          <button onClick={fetchCandidates} className="px-3 py-2 border rounded">Refresh</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden divide-y divide-gray-100 dark:divide-gray-800">
        {loading ? <div className="p-8 text-center">Loading...</div>
          : error ? <div className="p-8 text-center text-red-600">{error}</div>
            : candidates.length === 0 ? <div className="p-8 text-center">No candidates</div>
              : candidates.map((c) => renderRow(c))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? "Edit Candidate" : "Add Candidate"}>
        <CandidateForm initial={editing || {}} onCancel={() => { setModalOpen(false); setEditing(null); }} />
      </Modal>

      <Modal isOpen={!!avatarPreview} onClose={() => setAvatarPreview(null)} title="Profile Photo">
        <div className="p-4 flex justify-center items-center">
          {avatarPreview ? <img src={avatarPreview} alt="avatar large" className="max-w-full max-h-[60vh] rounded-lg object-contain" /> : <div>No image</div>}
        </div>
      </Modal>
    </div>
  );
}
