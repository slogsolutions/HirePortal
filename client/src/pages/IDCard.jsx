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
  const empCode = (C._id || DEMO._id).slice(-8);
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
















// import React, { useEffect, useRef, useState } from "react";
// import { useParams } from "react-router-dom";
// import api from "../api/axios";
// import html2canvas from "html2canvas";
// import jsPDF from "jspdf";

// const THEME = "#1E2939"; // brand color

// // Demo fallbacks (used only if API doesn’t provide a value)
// const DEMO = {
//   firstName: "Dinesh",
//   lastName: "Singh",
//   Designation: "IOT intern",
//   _id: "ace33b58",
//   mobile: "8383848384",
//   department: "IT",
//   DateOfJoining: "2025-06-11",
//   email: "dinesh@gmail.com",
//   Gender: "male",
//   dob: "2000-02-10",
//   BloodGroup: "AB-",
//   address: {
//     current: {
//       line1: "isbt, anant vihar",
//       line2: "",
//       city: "Dehrdun",
//       state: "Uttarakhand",
//       pincode: "248001",
//     },
//     isPG: true,
//     pgName: "axc",
//     pgOwnerName: "axc",
//     pgNumber: "1232111212",
//   },
//   photoUrl: "", // leave empty to show initials block
// };

// export default function IDCardPage() {
//   const { id } = useParams();
//   const [candidate, setCandidate] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const exportRef = useRef(null);

//   useEffect(() => {
//     if (!id) {
//       setError("No candidate ID in route");
//       setLoading(false);
//       return;
//     }
//     (async () => {
//       try {
//         const res = await api.get(`/candidates/${id}`);
//         setCandidate(res.data);
//       } catch (err) {
//         // show page but fill with demo so you can see the design
//         setCandidate(null);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [id]);

//   const C = candidate || DEMO; // pick API data or demo

//   const fmt = (iso) =>
//     iso ? new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" }) : "-";

//   const fullName = `${C.firstName || ""} ${C.lastName || ""}`.trim();
//   const empId = (C._id || DEMO._id || "").toString().slice(-8);

//   const exportBothToPDF = async () => {
//     if (!exportRef.current) return;
//     const canvas = await html2canvas(exportRef.current, { scale: 3, useCORS: true });
//     const img = canvas.toDataURL("image/png");
//     const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
//     const pageWidth = pdf.internal.pageSize.getWidth();
//     const margin = 10;
//     const drawWidth = pageWidth - margin * 2;
//     const drawHeight = (canvas.height * drawWidth) / canvas.width;
//     pdf.addImage(img, "PNG", margin, margin, drawWidth, drawHeight);
//     pdf.save(`${fullName || "employee"}_IDCard.pdf`);
//   };

//   const shareEmail = () => {
//     const subject = encodeURIComponent(`ID Card — ${fullName}`);
//     const body = encodeURIComponent(`View ${fullName}'s ID Card:\n${window.location.href}`);
//     window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
//   };

//   const shareWhatsApp = () => {
//     const text = encodeURIComponent(`ID Card — ${fullName}\n${window.location.href}`);
//     window.open(`https://wa.me/?text=${text}`, "_blank");
//   };

//   if (loading) return <div className="p-10 text-center text-gray-600">Loading...</div>;
//   if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

//   return (
//     <div className="max-w-6xl mx-auto p-6 space-y-6">
//       {/* Controls */}
//       <div className="flex flex-wrap gap-3 items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-semibold text-gray-800">Employee ID Card</h1>
//           <p className="text-sm text-gray-500">Preview and download front & back sides.</p>
//         </div>
//         <div className="flex gap-3">
//           <button onClick={exportBothToPDF} className="px-4 py-2 rounded-lg shadow text-white" style={{ background: THEME }}>
//             Save PDF
//           </button>
//           <button onClick={shareEmail} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700">
//             Share Email
//           </button>
//           <button onClick={shareWhatsApp} className="px-4 py-2 bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-700">
//             Share WhatsApp
//           </button>
//         </div>
//       </div>

//       {/* Preview (both sides) */}
//       <div
//         ref={exportRef}
//         className="flex flex-col lg:flex-row gap-8 items-start justify-center bg-gray-50 p-6 rounded-xl shadow-inner"
//       >
//         {/* Front */}
//         <div
//           className="w-[360px] h-[560px] bg-white rounded-2xl overflow-hidden relative"
//           style={{ border: `3px solid ${THEME}`, boxShadow: "0 8px 18px rgba(0,0,0,0.08)" }}
//         >
//           {/* Brand bar with logo + name */}
//           <div
//             className="flex items-center gap-3 px-4 py-3 text-white"
//             style={{ background: THEME }}
//           >
//             <img
//               src={C.companyLogoUrl || "/slog-logo.png"} // put slog-logo.png in /public
//               alt="Slog Solutions"
//               className="w-8 h-8 object-contain"
//             />
//             <div className="font-semibold tracking-wide">SLOG SOLUTIONS PVT. LTD.</div>
//           </div>

//           {/* Big photo */}
//           <div className="flex justify-center pt-4">
//             <div
//               className="overflow-hidden rounded-xl"
//               style={{
//                 width: 150, // larger photo
//                 height: 150,
//                 border: `3px solid ${THEME}22`,
//               }}
//             >
//               {C.photoUrl ? (
//                 <img src={C.photoUrl} alt="Employee" className="w-full h-full object-cover" />
//               ) : (
//                 <div className="w-full h-full flex items-center justify-center text-4xl font-bold" style={{ background: "#E8EEF5", color: THEME }}>
//                   {(C.firstName?.[0] || C.lastName?.[0] || "?").toUpperCase()}
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Name + designation (bold, tighter spacing) */}
//           <div className="text-center px-4 pt-3">
//             <h2 className="text-xl font-extrabold text-gray-900">{fullName}</h2>
//             <div className="mt-0.5 text-base font-bold" style={{ color: THEME }}>
//               {C.Designation || DEMO.Designation}
//             </div>
//           </div>

//           {/* Info list – compact spacing */}
//           <div className="mt-4 px-6 space-y-2.5 text-[15px]">
//             <Row label="Employee ID" value={empId} />
//             <Row label="Phone" value={C.mobile || DEMO.mobile} />
//             <Row label="Department" value={C.department || DEMO.department} />
//             <Row label="Date of Joining" value={fmt(C.DateOfJoining) || fmt(DEMO.DateOfJoining)} />
//           </div>

//           {/* Footer line */}
//           <div
//             className="absolute bottom-0 w-full text-center text-[11px] py-2 font-medium"
//             style={{ background: THEME, color: "white" }}
//           >
//             www.slogsolutions.com
//           </div>
//         </div>

//         {/* Back */}
//         <div
//           className="w-[360px] h-[560px] bg-white rounded-2xl overflow-hidden relative"
//           style={{ border: `3px solid ${THEME}`, boxShadow: "0 8px 18px rgba(0,0,0,0.08)" }}
//         >
//           <div className="px-4 py-3 text-white font-semibold tracking-wide" style={{ background: THEME }}>
//             EMPLOYEE INFORMATION
//           </div>

//           <div className="p-5 text-[15px] text-gray-800 space-y-2.5">
//             <Row label="Email" value={C.email || DEMO.email} />
//             <Row label="Gender" value={C.Gender || DEMO.Gender} />
//             <Row label="DOB" value={fmt(C.dob) || fmt(DEMO.dob)} />
//             <Row label="Blood Group" value={C.BloodGroup || DEMO.BloodGroup} />

//             <div className="pt-2">
//               <div className="text-[13px] uppercase tracking-wide font-semibold mb-1.5" style={{ color: THEME }}>
//                 Address
//               </div>
//               <div className="leading-tight">
//                 {C.address?.current?.line1 || DEMO.address.current.line1}
//                 {C.address?.current?.line2 ? `, ${C.address.current.line2}` : ""}
//                 ,<br />
//                 {(C.address?.current?.city || DEMO.address.current.city)},{" "}
//                 {(C.address?.current?.state || DEMO.address.current.state)} -{" "}
//                 {(C.address?.current?.pincode || DEMO.address.current.pincode)}
//               </div>
//             </div>

//             <div className="pt-2">
//               <div className="text-[13px] uppercase tracking-wide font-semibold mb-1.5" style={{ color: THEME }}>
//                 PG Details
//               </div>
//               {C.address?.isPG || DEMO.address.isPG ? (
//                 <div className="space-y-1.5">
//                   <Row label="PG Name" value={C.address?.pgName || DEMO.address.pgName} />
//                   <Row label="Owner" value={C.address?.pgOwnerName || DEMO.address.pgOwnerName} />
//                   <Row label="Number" value={C.address?.pgNumber || DEMO.address.pgNumber} />
//                 </div>
//               ) : (
//                 <div>Not staying in PG</div>
//               )}
//             </div>
//           </div>

//           <div
//             className="absolute bottom-0 w-full text-center text-[11px] py-2 font-medium"
//             style={{ background: THEME, color: "white" }}
//           >
//             Slog Solutions Pvt. Ltd. • Confidential
//           </div>
//         </div>
//       </div>

//       {/* Pretty (non-JSON) details if you still want to see raw data quickly */}
//       <div className="bg-white p-6 rounded-xl shadow space-y-3">
//         <h2 className="text-lg font-semibold text-gray-800">Employee Details (from API)</h2>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
//           <Row label="Full name" value={fullName} />
//           <Row label="Designation" value={C.Designation || "-"} />
//           <Row label="Department" value={C.department || "-"} />
//           <Row label="Email" value={C.email || "-"} />
//           <Row label="Phone" value={C.mobile || "-"} />
//           <Row label="Date of Joining" value={fmt(C.DateOfJoining)} />
//           <Row label="Aadhaar" value={C.aadhaarNumber || "-"} />
//           <Row label="PAN" value={C.panNumber || "-"} />
//         </div>
//       </div>
//     </div>
//   );
// }

// function Row({ label, value }) {
//   return (
//     <p className="flex items-start gap-2 leading-snug">
//       <span className="min-w-[120px] font-semibold text-gray-700">{label}:</span>
//       <span className="font-medium">{value || "-"}</span>
//     </p>
//   );
// }
