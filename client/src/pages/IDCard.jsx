// src/pages/IDCardPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { QRCodeCanvas } from "qrcode.react";
import * as htmlToImage from "html-to-image";

const DEMO = {
  firstName: "FirstName",
  lastName: "LastName",
  _id: "S-20789",
  BloodGroup: "A-ve",
  photoUrl: "/default-photo.jpg",
};

export default function IDCardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef(null);

  useEffect(() => {
    (async () => {
      if (!id) {
        setCandidate(DEMO);
        setLoading(false);
        return;
      }
      try {
        const res = await api.get(`/candidates/${id}`);
        setCandidate(res.data);
      } catch {
        setCandidate(DEMO);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  const C = candidate || DEMO;
  const fullName = `${C.firstName || ""} ${C.lastName || ""}`.trim();
  const empCode = C.empCode
  const bloodGroup = C.BloodGroup || DEMO.BloodGroup;
  const qrData = "https://www.slogsolutions.com/";

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, { cacheBust: true });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fullName}_IDCard.png`;
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  // WhatsApp share: downloads image first, opens WhatsApp web
  const handleShareWhatsApp = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, { cacheBust: true });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fullName}_IDCard.png`;
      link.click();
      // open WhatsApp Web with a prefilled message
      const message = encodeURIComponent(`Hi! I’ve shared the ID card for ${fullName}. Please attach the downloaded file.`);
      window.open(`https://web.whatsapp.com/send?text=${message}`, "_blank");
    } catch (err) {
      console.error(err);
    }
  };

  const handleShareEmail = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, { cacheBust: true });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fullName}_IDCard.png`;
      link.click();
      alert("Image downloaded! You can attach it in your email.");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen space-y-6 bg-gray-100 p-6">
      {/* Back button */}
      <button
        onClick={() => navigate("/candidates")}
        className="self-start mb-2 text-sm text-indigo-600 hover:underline"
      >
        &larr; Back
      </button>

      <h1 className="text-2xl font-bold text-gray-800">Employee ID Card</h1>
      <p className="text-gray-600 text-sm text-center max-w-md">
        Preview the ID card below. Download or share it via WhatsApp or Email.
      </p>

      {/* Action buttons */}
      <div className="flex gap-3 mt-3">
        <button onClick={handleDownload} className="px-5 py-2 rounded-lg bg-[#0E2A5A] text-white font-semibold shadow hover:opacity-90">
          Download
        </button>
        <button onClick={handleShareWhatsApp} className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold shadow hover:bg-green-700">
          Share WhatsApp
        </button>
        <button onClick={handleShareEmail} className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700">
          Share Email
        </button>
      </div>

      {/* ID Card */}
      <div
        ref={cardRef}
        className="relative bg-white rounded-xl shadow-lg overflow-hidden mt-4"
        style={{ width: "320px", height: "520px", border: "2px solid #0E2A5A", fontFamily: "'Poppins', sans-serif" }}
      >
        {/* Left blue strip */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "55px",
            height: "100%",
            backgroundColor: "rgb(14,42,90)",
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            color: "white",
            fontWeight: "900",
            fontSize: "26px",
            letterSpacing: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          SLOG SOLUTIONS PVT. LTD.
        </div>

        {/* Main content */}
        <div className="flex flex-col items-center" style={{ marginLeft: "45px", paddingTop: "6px", paddingBottom: "12px", height: "100%", boxSizing: "border-box" }}>
          <img src={`${window.location.origin}/slog-logo.png`} alt="Slog Logo" className="object-contain" style={{ width: "120px", marginBottom: "6px" }} crossOrigin="anonymous" />

   <div
  className="rounded-full overflow-hidden flex items-center justify-center"
  style={{ 
    width: "120px", 
    height: "120px", 
    border: "3px solid #0E2A5A", 
    backgroundColor: "transparent" // or "black" if you prefer
  }}
>
  {C.photoUrl ? (
    <img
      src={C.photoUrl}
      alt="Employee"
      className="w-full h-full object-cover"
      style={{ objectPosition: "center 20%" }} // move more up
      crossOrigin="anonymous"
    />
  ) : (
    <div
      className="flex items-center justify-center text-5xl font-bold text-white w-full h-full"
      style={{ backgroundColor: "#0E2A5A" }}
    >
      {fullName?.[0]?.toUpperCase() || "?"}
    </div>
  )}
</div>





          <h2 className="font-extrabold mt-3 text-center text-[#0E2A5A]" style={{ fontSize: "20px" }}>
            {fullName}
          </h2>

          <p className="text-red-600 font-semibold mt-1" style={{ fontSize: "15px" }}>
            Emp. code : {empCode}
          </p>
          <p className="text-red-600 font-semibold mb-2" style={{ fontSize: "15px" }}>
            Blood Group : {bloodGroup}
          </p>

          <div className="mt-2">
            <QRCodeCanvas value={qrData} size={100} />
          </div>

          <div className="text-center font-semibold mt-auto" style={{ fontSize: "12.5px", color: "#0E2A5A", lineHeight: "1.4", paddingBottom: "10px",paddingTop: "10px" }}>
            SLOG SOLUTIONS (P) LTD.
            <br />
            IEI CAMPUS, NEAR ISBT, DEHRADUN
          </div>
        </div>
      </div>
    </div>
  );
}
