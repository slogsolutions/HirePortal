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

  // ── Download as PNG (screen preview size, clean capture) ──
  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        style: { boxShadow: "none", borderRadius: "0" },
      });

      // Redraw on canvas to ensure full border is visible
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        // Redraw border so it's never clipped
        ctx.strokeStyle = "#0E2A5A";
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = `${fullName}_IDCard.png`;
        link.click();
      };
      img.src = dataUrl;
    } catch (err) {
      console.error(err);
    }
  };

  // ── Print: opens a new window with ONLY the card in exact cm sizes ──
  // This is the ONLY reliable way to get exact physical size on paper
  const handlePrint = () => {
    const cardHtml = cardRef.current?.outerHTML || "";
    const printWindow = window.open("", "_blank", "width=400,height=700");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8"/>
          <title>ID Card - ${fullName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap" rel="stylesheet"/>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page {
              size: 5cm 8.5cm;
              margin: 0;
            }
            html, body {
              width: 5cm;
              height: 8.5cm;
              overflow: hidden;
            }
            body {
              display: flex;
              align-items: center;
              justify-content: center;
            }
            #print-card {
              width: 5cm !important;
              height: 8.5cm !important;
              position: relative;
              background: white;
              overflow: hidden;
              border: 2px solid #0E2A5A;
              font-family: 'Poppins', sans-serif;
            }
            .strip {
              position: absolute;
              top: 0; left: 0;
              width: 1cm;
              height: 100%;
              background-color: rgb(14,42,90);
              writing-mode: vertical-rl;
              transform: rotate(180deg);
              color: white;
              font-weight: 900;
              font-size: 5pt;
              letter-spacing: 1px;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
            }
            .main {
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-left: 1cm;
              padding: 3mm 2mm 3mm 2mm;
              height: 100%;
            }
            .logo { width: 2cm; margin-bottom: 2mm; object-fit: contain; }
            .photo-ring {
              width: 1.8cm; height: 1.8cm;
              border-radius: 50%;
              overflow: hidden;
              border: 1.5pt solid #0E2A5A;
              flex-shrink: 0;
            }
            .photo-ring img { width: 100%; height: 100%; object-fit: cover; object-position: center 20%; }
            .name { font-weight: 800; margin-top: 2mm; text-align: center; color: #0E2A5A; font-size: 7pt; line-height: 1.3; }
            .info { color: #dc2626; font-weight: 600; font-size: 6pt; margin-top: 1mm; }
            .qr { margin-top: 2mm; }
            .footer {
              text-align: center; font-weight: 600;
              margin-top: auto; font-size: 5pt;
              color: #0E2A5A; line-height: 1.4;
              padding-bottom: 2mm; padding-top: 2mm;
            }
          </style>
        </head>
        <body>
          <div id="print-card">
            <div class="strip">SLOG SOLUTIONS PVT. LTD.</div>
            <div class="main">
              <img class="logo" src="${window.location.origin}/slog-logo.png" alt="Logo" crossorigin="anonymous"/>
              <div class="photo-ring">
                <img src="${C.photoUrl || ""}" alt="Employee" crossorigin="anonymous"/>
              </div>
              <div class="name">${fullName}</div>
              <div class="info">Emp. code : ${empCode || ""}</div>
              <div class="info">Blood Group : ${bloodGroup}</div>
              <div class="qr">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrData)}" width="55" height="55" alt="QR"/>
              </div>
              <div class="footer">
                SLOG SOLUTIONS (P) LTD.<br/>
                IEI CAMPUS, NEAR ISBT, DEHRADUN
              </div>
            </div>
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => { window.print(); window.close(); }, 800);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShareWhatsApp = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        style: { boxShadow: "none", borderRadius: "0" },
      });
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
    if (!cardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        style: { boxShadow: "none", borderRadius: "0" },
      });
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
    <>
      {/* ── Print-only styles injected into main page ── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-target { display: flex !important; }
        }
        #print-target { display: none; }
      `}</style>

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
          Preview below. Use <strong>Print</strong> for exact 5×8.5cm paper size.
        </p>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mt-3 justify-center">
          <button
            onClick={handlePrint}
            className="px-5 py-2 rounded-lg bg-[#0E2A5A] text-white font-semibold shadow hover:opacity-90"
          >
            🖨️ Print (Exact Size)
          </button>
          {/* <button
            onClick={handleDownload}
            className="px-5 py-2 rounded-lg bg-gray-700 text-white font-semibold shadow hover:opacity-90"
          >
            Download PNG
          </button> */}
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

        {/* ── Screen Preview Card ── */}
        <div
          ref={cardRef}
          id="id-card"
          style={{
            position: "relative",
            backgroundColor: "white",
            overflow: "hidden",
            marginTop: "16px",
            marginLeft: "auto",
            marginRight: "auto",
            // Screen preview at comfortable size
            width: "220px",
            height: "374px",
            border: "2.5px solid #0E2A5A",
            fontFamily: "'Poppins', sans-serif",
            boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
            flexShrink: 0,
          }}
        >
          {/* Left blue strip */}
          <div
            style={{
              position: "absolute",
              top: 0, left: 0,
              width: "42px",
              height: "100%",
              backgroundColor: "rgb(14,42,90)",
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              color: "white",
              fontWeight: "900",
              fontSize: "16px",
              letterSpacing: "1.2px",
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
              marginLeft: "42px",
              paddingTop: "8px",
              paddingBottom: "8px",
              paddingLeft: "5px",
              paddingRight: "5px",
              height: "100%",
              boxSizing: "border-box",
            }}
          >
            {/* Logo */}
            <img
              src={`${window.location.origin}/slog-logo.png`}
              alt="Slog Logo"
              style={{ width: "90px", marginBottom: "5px", objectFit: "contain" }}
              crossOrigin="anonymous"
            />

            {/* Photo */}
            <div
              style={{
                width: "80px", height: "80px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "2.5px solid #0E2A5A",
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
                <div style={{ backgroundColor: "#0E2A5A", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: "bold", color: "white" }}>
                  {fullName?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </div>

            {/* Name */}
            <h2 style={{ fontWeight: "800", marginTop: "7px", textAlign: "center", color: "#0E2A5A", fontSize: "11px", lineHeight: "1.3" }}>
              {fullName}
            </h2>

            {/* Emp Code */}
            <p style={{ color: "#dc2626", fontWeight: "600", marginTop: "4px", fontSize: "10px" }}>
              Emp. code : {empCode}
            </p>

            {/* Blood Group */}
            <p style={{ color: "#dc2626", fontWeight: "600", marginTop: "2px", marginBottom: "5px", fontSize: "10px" }}>
              Blood Group : {bloodGroup}
            </p>

            {/* QR Code */}
            <QRCodeCanvas value={qrData} size={65} />

            {/* Footer */}
            <div style={{ textAlign: "center", fontWeight: "600", marginTop: "auto", fontSize: "7.5px", color: "#0E2A5A", lineHeight: "1.5", paddingBottom: "6px", paddingTop: "4px" }}>
              SLOG SOLUTIONS (P) LTD.<br />
              IEI CAMPUS, NEAR ISBT, DEHRADUN
            </div>
          </div>
        </div>
      </div>
    </>
  );
}