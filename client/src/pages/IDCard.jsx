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
  empCode: "S-20789",
  BloodGroup: "A-ve",
  photoUrl: "/default-photo.jpg",
};

const CM = 37.7952;

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
  const empCode = C.empCode;
  const bloodGroup = C.BloodGroup || DEMO.BloodGroup;
  const qrData = "https://www.slogsolutions.com/";

  // Slightly increased: 5.5cm x 9cm
  const CARD_W_PX = Math.round(4.5 * CM);
  const CARD_H_PX = Math.round(8 * CM);

  const captureCard = async () => {
    if (!cardRef.current) return null;

    // Capture the card at screen size
    const dataUrl = await htmlToImage.toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      style: {
        borderRadius: "0",
        boxShadow: "none",
      },
    });

    // Redraw on a clean canvas with border fully visible and centered
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const BORDER = 3;
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        // White background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw card image
        ctx.drawImage(img, 0, 0);

        // Draw border on top so it's never clipped
        ctx.strokeStyle = "#0E2A5A";
        ctx.lineWidth = BORDER * 2; // *2 because half gets clipped at edge, so draw thicker
        ctx.strokeRect(0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/png"));
      };
      img.src = dataUrl;
    });
  };

  const handleDownload = async () => {
    try {
      const dataUrl = await captureCard();
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fullName}_IDCard.png`;
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      const dataUrl = await captureCard();
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${fullName}_IDCard.png`;
      link.click();
      const message = encodeURIComponent(
        `Hi! I've shared the ID card for ${fullName}. Please attach the downloaded file.`
      );
      window.open(`https://web.whatsapp.com/send?text=${message}`, "_blank");
    } catch (err) {
      console.error(err);
    }
  };

  const handleShareEmail = async () => {
    try {
      const dataUrl = await captureCard();
      if (!dataUrl) return;
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
    <div className="flex flex-col items-center min-h-screen space-y-6 bg-gray-100 p-6 dark:bg-slate-900">
      {/* Back button */}
      <button
        onClick={() => navigate("/candidates")}
        className="self-start mb-2 text-sm text-indigo-600 hover:underline"
      >
        &larr; Back
      </button>

      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Employee ID Card</h1>
      <p className="text-gray-600 text-sm text-center max-w-md dark:text-gray-300">
        Preview the ID card below. Download or share it via WhatsApp or Email.
      </p>

      {/* Action buttons */}
      <div className="flex gap-3 mt-3">
        <button
          onClick={handleDownload}
          className="px-5 py-2 rounded-lg bg-[#0E2A5A] text-white font-semibold shadow hover:opacity-90"
        >
          Download
        </button>
        <button
          onClick={handleShareWhatsApp}
          className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold shadow hover:bg-green-700"
        >
          Share WhatsApp
        </button>
        <button
          onClick={handleShareEmail}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700"
        >
          Share Email
        </button>
      </div>

      {/* ── ID CARD PREVIEW ── */}
      {/* FIX 1: outline instead of border so border never clips or shifts layout */}
      {/* FIX 2: margin auto centers it horizontally */}
      <div
        ref={cardRef}
        id="id-card"
        style={{
          position: "relative",
          backgroundColor: "white",
          overflow: "hidden",
          marginTop: "16px",
          marginLeft: "auto",   // ✅ centers horizontally
          marginRight: "auto",  // ✅ centers horizontally
          width: `${CARD_W_PX}px`,
          height: `${CARD_H_PX}px`,
          outline: "2.5px solid #0E2A5A",     // ✅ outline never gets clipped (unlike border)
          outlineOffset: "0px",
          fontFamily: "'Poppins', sans-serif",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          flexShrink: 0,
        }}
      >
        {/* Left blue strip */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: `${1 * CM}px`,
            height: "100%",
            backgroundColor: "rgb(14,42,90)",
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            color: "white",
            fontWeight: "900",
            fontSize: "7pt",
            letterSpacing: "1.5px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          SLOG SOLUTIONS PVT. LTD.
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginLeft: `${1 * CM}px`,
            paddingTop: "6px",
            paddingBottom: "8px",
            paddingLeft: "4px",
            paddingRight: "4px",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Logo */}
          <img
            src={`${window.location.origin}/slog-logo.png`}
            alt="Slog Logo"
            style={{ width: `${2 * CM}px`, marginBottom: "4px", objectFit: "contain" }}
            crossOrigin="anonymous"
          />

          {/* Photo circle */}
          <div
            style={{
              width: `${1.8 * CM}px`,
              height: `${1.8 * CM}px`,
              borderRadius: "50%",
              overflow: "hidden",
              border: "2px solid #0E2A5A",
              backgroundColor: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {C.photoUrl ? (
              <img
                src={C.photoUrl}
                alt="Employee"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 20%" }}
                crossOrigin="anonymous"
              />
            ) : (
              <div
                style={{
                  backgroundColor: "#0E2A5A",
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18pt",
                  fontWeight: "bold",
                  color: "white",
                }}
              >
                {fullName?.[0]?.toUpperCase() || "?"}
              </div>
            )}
          </div>

          {/* Name */}
          <h2
            style={{
              fontWeight: "800",
              marginTop: "5px",
              textAlign: "center",
              color: "#0E2A5A",
              fontSize: "8pt",
              lineHeight: "1.3",
            }}
          >
            {fullName}
          </h2>

          {/* Emp Code */}
          <p style={{ color: "#dc2626", fontWeight: "600", marginTop: "3px", fontSize: "7pt" }}>
            Emp. code : {empCode}
          </p>

          {/* Blood Group */}
          <p style={{ color: "#dc2626", fontWeight: "600", marginBottom: "4px", fontSize: "7pt" }}>
            Blood Group : {bloodGroup}
          </p>

          {/* QR Code */}
          <div style={{ marginTop: "4px" }}>
            <QRCodeCanvas value={qrData} size={60} />
          </div>

          {/* Footer address */}
          <div
            style={{
              textAlign: "center",
              fontWeight: "600",
              marginTop: "auto",
              fontSize: "6pt",
              color: "#0E2A5A",
              lineHeight: "1.4",
              paddingBottom: "6px",
              paddingTop: "6px",
            }}
          >
            SLOG SOLUTIONS (P) LTD.
            <br />
            IEI CAMPUS, NEAR ISBT, DEHRADUN
          </div>
        </div>
      </div>
    </div>
  );
}