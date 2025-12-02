import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

/**
 * VerifyCandidatePage — improved/resilient version
 * - tolerant to API shapes (res.data | res.data.data | res.data.candidate)
 * - clearer error messages and disabled buttons while processing
 * - supports mobile / email / fatherMobile OTP + manual verify
 */

function Badge({ verified, label }) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${
        verified ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"
      }`}
    >
      {verified ? (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M20 6L9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M18 6L6 18M6 6l12 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setMsg("");
        const res = await api.get(`/candidates/${id}`);
        // tolerate multiple response shapes:
        const payload = res?.data ?? res;
        const cand = payload?.data ?? payload?.candidate ?? payload;
        if (mounted) setCandidate(cand || null);
      } catch (err) {
        console.error("Failed fetching candidate:", err);
        setMsg(err?.response?.data?.message || "Failed to load candidate");
        if (mounted) setCandidate(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!candidate) return <div className="p-6">Candidate not found</div>;

  const displayPhone = (p) => (p ? p : "-");

  // Generic send OTP function. Backend may expect { type } but some accept { contact } — we try only type.
  const sendOtp = async (type) => {
    const contact =
      type === "mobile"
        ? candidate.mobile
        : type === "email"
        ? candidate.email
        : candidate.fatherMobile;
    if (!contact) return alert(`No ${type} contact available`);
    setProcessing(true);
    setMsg("");
    try {
      // Some backends expect /candidates/:id/verify/send-otp ; some expect /verify/send-otp
      // We'll call the primary endpoint and rely on backend routing. If your API differs, update this.
      await api.post(`/candidates/${id}/verify/send-otp`, { type });
      setOtpSent(true);
      setOtpType(type);
      setMsg(
        `OTP sent to ${type === "fatherMobile" ? "father's mobile" : type}.`
      );
    } catch (err) {
      console.error("sendOtp error:", err);
      const serverMsg = err?.response?.data?.message;
      setMsg(serverMsg || `Failed to send OTP (${type}).`);
    } finally {
      setProcessing(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) return alert("Enter OTP");
    if (!otpType) return alert("No OTP type selected");
    setProcessing(true);
    setMsg("");
    try {
      await api.post(`/candidates/${id}/verify/confirm-otp`, {
        type: otpType,
        otp,
      });
      // re-fetch the candidate record
      const res = await api.get(`/candidates/${id}`);
      const payload = res?.data ?? res;
      const cand = payload?.data ?? payload?.candidate ?? payload;
      setCandidate(cand || null);
      setMsg(`${otpType} verified!`);
      setOtp("");
      setOtpSent(false);
      setOtpType(null);
    } catch (err) {
      console.error("verifyOtp error:", err);
      const serverMsg = err?.response?.data?.message;
      setMsg(serverMsg || "OTP verification failed");
    } finally {
      setProcessing(false);
    }
  };

  const manualVerify = async (field) => {
    if (!window.confirm(`Mark ${field} as verified manually?`)) return;
    setProcessing(true);
    setMsg("");
    try {
      const payload = {};
      if (field === "mobile") payload.mobileVerified = true;
      if (field === "email") payload.emailVerified = true;
      if (field === "aadhaar") payload.aadhaarVerified = true;
      if (field === "fatherMobile") payload.fatherMobileVerified = true;
      await api.put(`/candidates/${id}`, payload);
      const res = await api.get(`/candidates/${id}`);
      const payload2 = res?.data ?? res;
      const cand = payload2?.data ?? payload2?.candidate ?? payload2;
      setCandidate(cand || null);
      setMsg(`${field} marked verified`);
    } catch (err) {
      console.error("manualVerify error:", err);
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
      if (
        !window.confirm(
          "Not all verifications complete. Mark as verified and continue?"
        )
      )
        return;
    }

    setProcessing(true);
    setMsg("");
    try {
      await api.put(`/candidates/${id}`, { status: "interviewing" });
      navigate(`/candidates/${id}`);
    } catch (err) {
      console.error("finishVerifications error:", err);
      setMsg(err?.response?.data?.message || "Failed to update status");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white shadow-lg rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <button
            onClick={() => navigate(`/candidates/${id}`)}
            className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
          >
            <span className="text-lg">&larr;</span> Back
          </button>
        </div>
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
                  <div className="text-sm text-gray-500">
                    {candidate.Designation || "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    verified={candidate.status === "interviewing"}
                    label={candidate.status || "N/A"}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Badge verified={!!candidate.mobileVerified} label="Mobile" />
                <Badge verified={!!candidate.emailVerified} label="Email" />
                <Badge verified={!!candidate.aadhaarVerified} label="Aadhaar" />
                <Badge
                  verified={!!candidate.fatherMobileVerified}
                  label="Father Mobile"
                />
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
                  <div className="font-medium">
                    {displayPhone(candidate.mobile)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Verified: {candidate.mobileVerified ? "Yes" : "No"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => manualVerify("mobile")}
                    className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
                    disabled={processing}
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
                    <div className="text-sm text-gray-500">
                      Verified: {candidate.emailVerified ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => manualVerify("email")}
                      className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
                      disabled={processing}
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
                    <div className="font-medium">
                      {candidate.aadhaarNumber || "-"}
                    </div>
                    <div className="text-sm text-gray-500">
                      Verified: {candidate.aadhaarVerified ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => manualVerify("aadhaar")}
                      className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
                      disabled={processing}
                    >
                      Manual Verify
                    </button>
                  </div>
                </div>
              </FieldRow>
            </div>
          </div>

          <div className="rounded-lg border p-4 bg-white">
            <h3 className="text-lg font-medium mb-3">
              Father / Emergency Contact
            </h3>

            <FieldRow title="Father Name">
              <div className="font-medium">{candidate.fatherName || "-"}</div>
            </FieldRow>

            <div className="mt-3">
              <FieldRow title="Father Mobile">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">
                      {displayPhone(candidate.fatherMobile)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Verified: {candidate.fatherMobileVerified ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => manualVerify("fatherMobile")}
                      className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
                      disabled={processing}
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

          {otpSent && (
            <div className="rounded-lg border p-4 bg-gray-50 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-1">
                  Enter OTP ({otpType})
                </div>
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
            <button
              onClick={() => navigate(`/candidates/${id}`)}
              className="px-4 py-2 rounded border"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
