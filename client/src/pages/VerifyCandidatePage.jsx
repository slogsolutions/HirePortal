import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function VerifyCandidatePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpType, setOtpType] = useState(null); // NEW: track which OTP is active (mobile/email)
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

  // === MOBILE + EMAIL OTP shared functions ===
  const sendOtp = async (type) => {
    const contact = type === "mobile" ? candidate.mobile : candidate.email;
    if (!contact) return alert(`No ${type} to send OTP`);
    setProcessing(true);
    try {
      await api.post(`/candidates/${id}/verify/send-otp`, { type });
      setOtpSent(true);
      setOtpType(type); // NEW
      setMsg(`OTP sent to candidate ${type}.`);
    } catch (err) {
      console.error(err);
      setMsg(err?.response?.data?.message || `Failed to send ${type} OTP`);
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
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-4">
        Verify Candidate — {candidate.firstName} {candidate.lastName}
      </h2>
      <div className="space-y-3">
        {/* MOBILE SECTION */}
        <div>
          <div className="text-xs text-gray-500">Mobile</div>
          <div className="flex items-center gap-2">
            <div>{candidate.mobile || "-"}</div>
            <div className="text-sm text-gray-500">
              Verified: {candidate.mobileVerified ? "Yes" : "No"}
            </div>
            <button
              onClick={() => manualVerify("mobile")}
              className="px-2 py-1 bg-gray-100 rounded text-sm"
            >
              Manual Verify
            </button>
            <button
              onClick={() => sendOtp("mobile")}
              disabled={processing || candidate.mobileVerified}
              className="px-2 py-1 bg-indigo-600 text-white rounded text-sm"
            >
              Send OTP
            </button>
          </div>
        </div>

        {/* EMAIL SECTION (added email OTP flow) */}
        <div>
          <div className="text-xs text-gray-500">Email</div>
          <div className="flex items-center gap-2">
            <div>{candidate.email || "-"}</div>
            <div className="text-sm text-gray-500">
              Verified: {candidate.emailVerified ? "Yes" : "No"}
            </div>
            <button
              onClick={() => manualVerify("email")}
              className="px-2 py-1 bg-gray-100 rounded text-sm"
            >
              Manual Verify
            </button>
            <button
              onClick={() => sendOtp("email")}
              disabled={processing || candidate.emailVerified}
              className="px-2 py-1 bg-indigo-600 text-white rounded text-sm"
            >
              Send Email OTP
            </button>
          </div>
        </div>

        {/* AADHAAR SECTION */}
        <div>
          <div className="text-xs text-gray-500">Aadhaar</div>
          <div className="flex items-center gap-2">
            <div>{candidate.aadhaarNumber || "-"}</div>
            <div className="text-sm text-gray-500">
              Verified: {candidate.aadhaarVerified ? "Yes" : "No"}
            </div>
            <button
              onClick={() => manualVerify("aadhaar")}
              className="px-2 py-1 bg-gray-100 rounded text-sm"
            >
              Manual Verify
            </button>
          </div>
        </div>

        {/* OTP BOX (shared for both mobile/email) */}
        {otpSent && (
          <div className="mt-2 flex gap-2">
            <input
              placeholder={`Enter ${otpType} OTP`}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="border rounded px-2 py-1"
            />
            <button
              onClick={verifyOtp}
              disabled={processing}
              className="px-2 py-1 bg-indigo-600 text-white rounded text-sm"
            >
              Verify OTP
            </button>
          </div>
        )}

        {msg && <div className="text-sm text-indigo-600">{msg}</div>}

        <div className="flex gap-2 mt-4">
          <button
            onClick={finishVerifications}
            disabled={processing}
            className="px-3 py-2 bg-indigo-600 text-white rounded"
          >
            {processing ? "Processing..." : "Finish & Set Interviewing"}
          </button>
          <button
            onClick={() => navigate(`/candidates/${id}`)}
            className="px-3 py-2 border rounded"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
