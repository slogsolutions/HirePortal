// import React, { useEffect, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import api from "../api/axios";

// export default function VerifyCandidatePage() {
//   const { id } = useParams();
//   const navigate = useNavigate();

//   const [candidate, setCandidate] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [processing, setProcessing] = useState(false);
//   const [otpSent, setOtpSent] = useState(false);
//   const [otpType, setOtpType] = useState(null); // NEW: track which OTP is active (mobile/email)
//   const [otp, setOtp] = useState("");
//   const [msg, setMsg] = useState("");

//   useEffect(() => {
//     (async () => {
//       try {
//         setLoading(true);
//         const res = await api.get(`/candidates/${id}`);
//         setCandidate(res.data);
//       } catch (err) {
//         console.error(err);
//         setMsg("Failed to load candidate");
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [id]);

//   if (loading) return <div className="p-6">Loading...</div>;
//   if (!candidate) return <div className="p-6">Candidate not found</div>;

//   // === MOBILE + EMAIL OTP shared functions ===
//   const sendOtp = async (type) => {
//     const contact = type === "mobile" ? candidate.mobile : candidate.email;
//     if (!contact) return alert(`No ${type} to send OTP`);
//     setProcessing(true);
//     try {
//       await api.post(`/candidates/${id}/verify/send-otp`, { type });
//       setOtpSent(true);
//       setOtpType(type); // NEW
//       setMsg(`OTP sent to candidate ${type}.`);
//     } catch (err) {
//       console.error(err);
//       setMsg(err?.response?.data?.message || `Failed to send ${type} OTP`);
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const verifyOtp = async () => {
//     if (!otp) return alert("Enter OTP");
//     if (!otpType) return alert("No OTP type selected");
//     setProcessing(true);
//     try {
//       await api.post(`/candidates/${id}/verify/confirm-otp`, { type: otpType, otp });
//       const { data } = await api.get(`/candidates/${id}`);
//       setCandidate(data);
//       setMsg(`${otpType} verified!`);
//       setOtp("");
//       setOtpSent(false);
//       setOtpType(null);
//     } catch (err) {
//       console.error(err);
//       setMsg(err?.response?.data?.message || "OTP verification failed");
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const manualVerify = async (field) => {
//     if (!window.confirm(`Mark ${field} as verified manually?`)) return;
//     setProcessing(true);
//     try {
//       const payload = {};
//       if (field === "mobile") payload.mobileVerified = true;
//       if (field === "email") payload.emailVerified = true;
//       if (field === "aadhaar") payload.aadhaarVerified = true;
//       await api.put(`/candidates/${id}`, payload);
//       const { data } = await api.get(`/candidates/${id}`);
//       setCandidate(data);
//       setMsg(`${field} marked verified`);
//     } catch (err) {
//       console.error(err);
//       setMsg(err?.response?.data?.message || "Manual verify failed");
//     } finally {
//       setProcessing(false);
//     }
//   };

//   const finishVerifications = async () => {
//     const needMobile = !!candidate.mobile && !candidate.mobileVerified;
//     const needEmail = !!candidate.email && !candidate.emailVerified;
//     const needAadhaar = !!candidate.aadhaarNumber && !candidate.aadhaarVerified;

//     if (needMobile || needEmail || needAadhaar) {
//       if (!window.confirm("Not all verifications complete. Mark as verified and continue?")) return;
//     }

//     setProcessing(true);
//     try {
//       await api.put(`/candidates/${id}`, { status: "interviewing" });
//       navigate(`/candidates/${id}`);
//     } catch (err) {
//       console.error(err);
//       setMsg(err?.response?.data?.message || "Failed to update status");
//     } finally {
//       setProcessing(false);
//     }
//   };

//   return (
//     <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow">
//       <h2 className="text-xl font-semibold mb-4">
//         Verify Candidate — {candidate.firstName} {candidate.lastName}
//       </h2>
//       <div className="space-y-3">
//         {/* MOBILE SECTION */}
//         <div>
//           <div className="text-xs text-gray-500">Mobile</div>
//           <div className="flex items-center gap-2">
//             <div>{candidate.mobile || "-"}</div>
//             <div className="text-sm text-gray-500">
//               Verified: {candidate.mobileVerified ? "Yes" : "No"}
//             </div>
//             <button
//               onClick={() => manualVerify("mobile")}
//               className="px-2 py-1 bg-gray-100 rounded text-sm"
//             >
//               Manual Verify
//             </button>
//             <button
//               onClick={() => sendOtp("mobile")}
//               disabled={processing || candidate.mobileVerified}
//               className="px-2 py-1 bg-indigo-600 text-white rounded text-sm"
//             >
//               Send OTP
//             </button>
//           </div>
//         </div>

//         {/* EMAIL SECTION (added email OTP flow) */}
//         <div>
//           <div className="text-xs text-gray-500">Email</div>
//           <div className="flex items-center gap-2">
//             <div>{candidate.email || "-"}</div>
//             <div className="text-sm text-gray-500">
//               Verified: {candidate.emailVerified ? "Yes" : "No"}
//             </div>
//             <button
//               onClick={() => manualVerify("email")}
//               className="px-2 py-1 bg-gray-100 rounded text-sm"
//             >
//               Manual Verify
//             </button>
//             <button
//               onClick={() => sendOtp("email")}
//               disabled={processing || candidate.emailVerified}
//               className="px-2 py-1 bg-indigo-600 text-white rounded text-sm"
//             >
//               Send Email OTP
//             </button>
//           </div>
//         </div>

//         {/* AADHAAR SECTION */}
//         <div>
//           <div className="text-xs text-gray-500">Aadhaar</div>
//           <div className="flex items-center gap-2">
//             <div>{candidate.aadhaarNumber || "-"}</div>
//             <div className="text-sm text-gray-500">
//               Verified: {candidate.aadhaarVerified ? "Yes" : "No"}
//             </div>
//             <button
//               onClick={() => manualVerify("aadhaar")}
//               className="px-2 py-1 bg-gray-100 rounded text-sm"
//             >
//               Manual Verify
//             </button>
//           </div>
//         </div>

//         {/* OTP BOX (shared for both mobile/email) */}
//         {otpSent && (
//           <div className="mt-2 flex gap-2">
//             <input
//               placeholder={`Enter ${otpType} OTP`}
//               value={otp}
//               onChange={(e) => setOtp(e.target.value)}
//               className="border rounded px-2 py-1"
//             />
//             <button
//               onClick={verifyOtp}
//               disabled={processing}
//               className="px-2 py-1 bg-indigo-600 text-white rounded text-sm"
//             >
//               Verify OTP
//             </button>
//           </div>
//         )}

//         {msg && <div className="text-sm text-indigo-600">{msg}</div>}

//         <div className="flex gap-2 mt-4">
//           <button
//             onClick={finishVerifications}
//             disabled={processing}
//             className="px-3 py-2 bg-indigo-600 text-white rounded"
//           >
//             {processing ? "Processing..." : "Finish & Set Interviewing"}
//           </button>
//           <button
//             onClick={() => navigate(`/candidates/${id}`)}
//             className="px-3 py-2 border rounded"
//           >
//             Back
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

/**
 * VerifyCandidatePage (updated)
 * - Modern UI with verified/unverified badges (SVG icons)
 * - Adds Father Mobile verification section (Send OTP + Manual Verify)
 * - Reuses your existing API routes:
 *    POST  /api/candidates/:id/verify/send-otp   -> { type: 'mobile' | 'email' | 'fatherMobile' }
 *    POST  /api/candidates/:id/verify/confirm-otp-> { type, otp }
 *    PUT   /api/candidates/:id                   -> patch verified flags / status
 *
 * Note: I only changed UI + added father flow. Backend unchanged.
 */

function Badge({ verified, label }) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${
        verified ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
      }`}
    >
      {verified ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      <span>{label}</span>
    </span>
  );
}

function FieldRow({ title, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="text-sm text-gray-500 w-40">{title}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default function VerifyCandidatePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpType, setOtpType] = useState(null);
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get(`/candidates/${id}`);
        setCandidate(res.data);
      } catch (err) {
        console.error(err);
        setMsg("Failed to load candidate");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!candidate) return <div className="p-6">Candidate not found</div>;

  // helper to display phone nicely (keeps original formatting if present)
  const displayPhone = (p) => (p ? p : "-");

  // send OTP for candidate mobile/email or father mobile
  const sendOtp = async (type) => {
    const contact =
      type === "mobile" ? candidate.mobile : type === "email" ? candidate.email : candidate.fatherMobile;
    if (!contact) return alert(`No ${type} contact available`);
    setProcessing(true);
    try {
      await api.post(`/candidates/${id}/verify/send-otp`, { type });
      setOtpSent(true);
      setOtpType(type);
      setMsg(`OTP sent to ${type === "fatherMobile" ? "Father Mobile" : type}.`);
    } catch (err) {
      console.error(err);
      setMsg(err?.response?.data?.message || `Failed to send OTP`);
    } finally {
      setProcessing(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) return alert("Enter OTP");
    if (!otpType) return alert("No OTP type selected");
    setProcessing(true);
    try {
      await api.post(`/candidates/${id}/verify/confirm-otp`, { type: otpType, otp });
      const { data } = await api.get(`/candidates/${id}`);
      setCandidate(data);
      setMsg(`${otpType} verified!`);
      setOtp("");
      setOtpSent(false);
      setOtpType(null);
    } catch (err) {
      console.error(err);
      setMsg(err?.response?.data?.message || "OTP verification failed");
    } finally {
      setProcessing(false);
    }
  };

  const manualVerify = async (field) => {
    if (!window.confirm(`Mark ${field} as verified manually?`)) return;
    setProcessing(true);
    try {
      const payload = {};
      if (field === "mobile") payload.mobileVerified = true;
      if (field === "email") payload.emailVerified = true;
      if (field === "aadhaar") payload.aadhaarVerified = true;
      if (field === "fatherMobile") payload.fatherMobileVerified = true;
      await api.put(`/candidates/${id}`, payload);
      const { data } = await api.get(`/candidates/${id}`);
      setCandidate(data);
      setMsg(`${field} marked verified`);
    } catch (err) {
      console.error(err);
      setMsg(err?.response?.data?.message || "Manual verify failed");
    } finally {
      setProcessing(false);
    }
  };

  const finishVerifications = async () => {
    const needMobile = !!candidate.mobile && !candidate.mobileVerified;
    const needEmail = !!candidate.email && !candidate.emailVerified;
    const needAadhaar = !!candidate.aadhaarNumber && !candidate.aadhaarVerified;

    if (needMobile || needEmail || needAadhaar) {
      if (!window.confirm("Not all verifications complete. Mark as verified and continue?")) return;
    }

    setProcessing(true);
    try {
      await api.put(`/candidates/${id}`, { status: "interviewing" });
      navigate(`/candidates/${id}`);
    } catch (err) {
      console.error(err);
      setMsg(err?.response?.data?.message || "Failed to update status");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center gap-4">
            <img
              src={candidate.photoUrl || "https://via.placeholder.com/80"}
              alt="profile"
              className="w-20 h-20 rounded-full object-cover"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold">
                    {candidate.firstName} {candidate.lastName}
                  </h2>
                  <div className="text-sm text-gray-500">{candidate.Designation || "—"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge verified={candidate.status === "interviewing"} label={candidate.status} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Badge verified={candidate.mobileVerified} label="Mobile" />
                <Badge verified={candidate.emailVerified} label="Email" />
                <Badge verified={candidate.aadhaarVerified} label="Aadhaar" />
                <Badge verified={candidate.fatherMobileVerified} label="Father Mobile" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 grid gap-6">
          <div className="rounded-lg border p-4 bg-gray-50">
            <h3 className="text-lg font-medium mb-3">Contact & Verification</h3>

            <FieldRow title="Mobile">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{displayPhone(candidate.mobile)}</div>
                  <div className="text-sm text-gray-500">Verified: {candidate.mobileVerified ? "Yes" : "No"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => manualVerify("mobile")}
                    className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
                  >
                    Manual Verify
                  </button>
                  <button
                    onClick={() => sendOtp("mobile")}
                    disabled={processing || candidate.mobileVerified}
                    className="px-3 py-1 rounded bg-indigo-600 text-white text-sm"
                  >
                    Send OTP
                  </button>
                </div>
              </div>
            </FieldRow>

            <div className="mt-4">
              <FieldRow title="Email">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{candidate.email || "-"}</div>
                    <div className="text-sm text-gray-500">Verified: {candidate.emailVerified ? "Yes" : "No"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => manualVerify("email")}
                      className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
                    >
                      Manual Verify
                    </button>
                    <button
                      onClick={() => sendOtp("email")}
                      disabled={processing || candidate.emailVerified}
                      className="px-3 py-1 rounded bg-indigo-600 text-white text-sm"
                    >
                      Send Email OTP
                    </button>
                  </div>
                </div>
              </FieldRow>
            </div>

            <div className="mt-4">
              <FieldRow title="Aadhaar">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{candidate.aadhaarNumber || "-"}</div>
                    <div className="text-sm text-gray-500">Verified: {candidate.aadhaarVerified ? "Yes" : "No"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => manualVerify("aadhaar")}
                      className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
                    >
                      Manual Verify
                    </button>
                  </div>
                </div>
              </FieldRow>
            </div>
          </div>

          {/* Father section */}
          <div className="rounded-lg border p-4 bg-white">
            <h3 className="text-lg font-medium mb-3">Father / Emergency Contact</h3>

            <FieldRow title="Father Name">
              <div className="font-medium">{candidate.fatherName || "-"}</div>
            </FieldRow>

            <div className="mt-3">
              <FieldRow title="Father Mobile">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{displayPhone(candidate.fatherMobile)}</div>
                    <div className="text-sm text-gray-500">
                      Verified: {candidate.fatherMobileVerified ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => manualVerify("fatherMobile")}
                      className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
                    >
                      Manual Verify
                    </button>
                    <button
                      onClick={() => sendOtp("fatherMobile")}
                      disabled={processing || candidate.fatherMobileVerified}
                      className="px-3 py-1 rounded bg-indigo-600 text-white text-sm"
                    >
                      Send OTP
                    </button>
                  </div>
                </div>
              </FieldRow>
            </div>
          </div>

          {/* Shared OTP input area */}
          {otpSent && (
            <div className="rounded-lg border p-4 bg-gray-50 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-1">Enter OTP ({otpType})</div>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={verifyOtp}
                  disabled={processing}
                  className="px-4 py-2 rounded bg-indigo-600 text-white"
                >
                  Verify
                </button>
                <button
                  onClick={() => {
                    setOtp("");
                    setOtpSent(false);
                    setOtpType(null);
                    setMsg("");
                  }}
                  className="px-3 py-2 rounded border"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {msg && <div className="text-sm text-indigo-600">{msg}</div>}

          <div className="flex justify-end gap-2">
            <button
              onClick={finishVerifications}
              disabled={processing}
              className="px-4 py-2 rounded bg-indigo-600 text-white"
            >
              {processing ? "Processing..." : "Finish & Set Interviewing"}
            </button>
            <button onClick={() => navigate(`/candidates/${id}`)} className="px-4 py-2 rounded border">
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
