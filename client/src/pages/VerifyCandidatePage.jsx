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

  const sendOtp = async () => {
    if (!candidate.mobile) return alert("No mobile to send OTP");
    setProcessing(true);
    try {
      // backend: POST /candidates/:id/verify/send-otp { type: 'mobile' }
      await api.post(`/candidates/${id}/verify/send-otp`, { type: "mobile" });
      setOtpSent(true);
      setMsg("OTP sent to candidate mobile.");
    } catch (err) {
      console.error(err);
      setMsg(err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setProcessing(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp) return alert("Enter OTP");
    setProcessing(true);
    try {
      // backend: POST /candidates/:id/verify/confirm-otp { type:'mobile', otp }
      await api.post(`/candidates/${id}/verify/confirm-otp`, { type: "mobile", otp });
      // refresh candidate
      const { data } = await api.get(`/candidates/${id}`);
      setCandidate(data);
      setMsg("Mobile verified!");
    } catch (err) {
      console.error(err);
      setMsg(err?.response?.data?.message || "OTP verification failed");
    } finally {
      setProcessing(false);
    }
  };

  const manualVerify = async (field) => {
    // e.g. field: 'mobile' or 'email' or 'aadhaar'
    if (!window.confirm(`Mark ${field} as verified manually?`)) return;
    setProcessing(true);
    try {
      // backend supports mark verify endpoint: PUT /candidates/:id { mobileVerified: true } etc
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
    // decide condition: all verifications required? here we check mobile+email+aadhaar
    // You can change rules as needed (maybe only mobile/email required)
    const needMobile = !!candidate.mobile && !candidate.mobileVerified;
    const needEmail = !!candidate.email && !candidate.emailVerified;
    const needAadhaar = !!candidate.aadhaarNumber && !candidate.aadhaarVerified;

    if (needMobile || needEmail || needAadhaar) {
      if (!window.confirm("Not all verifications complete. Mark as verified and continue?")) return;
    }

    setProcessing(true);
    try {
      // Update status to interviewing
      await api.put(`/candidates/${id}`, { status: "interviewing" });
      // reload and navigate back to profile or to interview page
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
      <h2 className="text-xl font-semibold mb-4">Verify Candidate — {candidate.firstName} {candidate.lastName}</h2>
      <div className="space-y-3">
        <div>
          <div className="text-xs text-gray-500">Mobile</div>
          <div className="flex items-center gap-2">
            <div>{candidate.mobile || "-"}</div>
            <div className="text-sm text-gray-500">Verified: {candidate.mobileVerified ? "Yes" : "No"}</div>
            <button onClick={() => manualVerify("mobile")} className="px-2 py-1 bg-gray-100 rounded text-sm">Manual Verify</button>
            <button onClick={sendOtp} disabled={processing || candidate.mobileVerified} className="px-2 py-1 bg-indigo-600 text-white rounded text-sm">
              Send OTP
            </button>
          </div>
          {otpSent && (
            <div className="mt-2 flex gap-2">
              <input placeholder="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} className="border rounded px-2 py-1" />
              <button onClick={verifyOtp} disabled={processing} className="px-2 py-1 bg-indigo-600 text-white rounded text-sm">Verify OTP</button>
            </div>
          )}
        </div>

        <div>
          <div className="text-xs text-gray-500">Email</div>
          <div className="flex items-center gap-2">
            <div>{candidate.email || "-"}</div>
            <div className="text-sm text-gray-500">Verified: {candidate.emailVerified ? "Yes" : "No"}</div>
            <button onClick={() => manualVerify("email")} className="px-2 py-1 bg-gray-100 rounded text-sm">Manual Verify</button>
            {/* add an email-otp flow similarly if you have backend support */}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500">Aadhaar</div>
          <div className="flex items-center gap-2">
            <div>{candidate.aadhaarNumber || "-"}</div>
            <div className="text-sm text-gray-500">Verified: {candidate.aadhaarVerified ? "Yes" : "No"}</div>
            <button onClick={() => manualVerify("aadhaar")} className="px-2 py-1 bg-gray-100 rounded text-sm">Manual Verify</button>
          </div>
        </div>

        {msg && <div className="text-sm text-indigo-600">{msg}</div>}

        <div className="flex gap-2 mt-4">
          <button onClick={finishVerifications} disabled={processing} className="px-3 py-2 bg-indigo-600 text-white rounded">
            {processing ? "Processing..." : "Finish & Set Interviewing"}
          </button>
          <button onClick={() => navigate(`/candidates/${id}`)} className="px-3 py-2 border rounded">
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
