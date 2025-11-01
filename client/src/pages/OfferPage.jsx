import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function OfferPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [form, setForm] = useState({
    designation: "",
    ctc: "",
    joiningDate: new Date().toISOString().slice(0, 10),
  });
  const [latestOffer, setLatestOffer] = useState(null);

  // Fetch candidate and latest offer
  useEffect(() => {
    (async () => {
      console.log("Fetching candidate data and offers for id:", id);
      try {
        const res = await api.get(`/candidates/${id}`);
        console.log("Candidate data:", res.data);
        setCandidate(res.data);
        setForm((f) => ({ ...f, designation: res.data.Designation || f.designation }));

        const offersRes = await api.get(`/candidates/${id}/offers`);
        console.log("Offers fetched:", offersRes.data);
        if (Array.isArray(offersRes.data) && offersRes.data.length > 0) {
          setLatestOffer(offersRes.data[0]);
        }
      } catch (err) {
        console.error("Error fetching candidate/offers:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!candidate) return <div className="p-6">Candidate not found</div>;

  // Generate new offer
  const generateOffer = async () => {
    if (!window.confirm("Generate offer letter and mark candidate as offered?")) return;
    setGenerating(true);
    try {
      console.log("Generating offer with form data:", form);
      const res = await api.post(`/candidates/${id}/offer/generate`, form);
      console.log("Offer generated response:", res.data);
      const { offer, url } = res.data;

      setLatestOffer(offer);

      if (url) {
        console.log("Opening offer preview URL:", url);
        window.open(url, "_blank");
      } else {
        alert("Offer generated successfully. Preview/download from the Offers section.");
      }
    } catch (err) {
      console.error("Offer generation error:", err.response || err);
      alert(err?.response?.data?.message || "Offer generation failed");
    } finally {
      setGenerating(false);
    }
  };

  // Preview offer
const previewOffer = () => {
  if (!latestOffer) return alert("No offer to preview");
  const url = latestOffer.url || `http://localhost:5000/offers/offer-${latestOffer._id}.pdf`;
  console.log("Previewing offer at URL:", url);
  window.open(url, "_blank");
};

  // Download offer
  const downloadOffer = () => {
    if (!latestOffer) return alert("No offer to download");
    const url = `${window.location.origin}/api/offers/${latestOffer._id}/download`;
    console.log("Downloading offer from URL:", url);
    window.open(url, "_blank");
  };

  // Send offer via email
  const sendEmail = async () => {
    if (!latestOffer) return alert("No offer to send");
    if (!window.confirm(`Send offer to ${candidate.email}?`)) return;

    setEmailing(true);
    try {
      console.log("Sending email for offer:", latestOffer._id);
      const res = await api.post(`/offers/${latestOffer._id}/send-email`, {
        to: candidate.email,
        subject: `Offer Letter from Company`,
        message: `Hello ${candidate.firstName},\nPlease find attached your offer letter.\n\nRegards,\nHR`,
      });
      console.log("Email sent response:", res.data);
      alert("Email sent successfully");
    } catch (err) {
      console.error("Send email error:", err.response || err);
      alert(err?.response?.data?.message || "Failed to send email");
    } finally {
      setEmailing(false);
    }
  };

  const proceedNextRound = async() => {
    // navigate(`/candidates/${id}`);
    try {
      await api.put(`/candidates/${id}`, { status: "accepted" });
      alert("Candidate have being offered");
      navigate(`/candidates/${id}`);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Final submit failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow">
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <button
            onClick={() => navigate(`/candidates/${id}`)}
            className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
          >
            <span className="text-lg">&larr;</span> Back
          </button>
        </div>
      <h2 className="text-xl font-semibold mb-4">
        Offer — {candidate.firstName} {candidate.lastName}
      </h2>

      {/* Offer form */}
      <div className="grid grid-cols-1 gap-3">
        <label className="text-xs text-gray-500">Designation</label>
        <input
          value={form.designation}
          onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
          className="w-full border rounded px-2 py-1"
        />

        <label className="text-xs text-gray-500">CTC</label>
        <input
          value={form.ctc}
          onChange={(e) => setForm((f) => ({ ...f, ctc: e.target.value }))}
          className="w-full border rounded px-2 py-1"
        />

        <label className="text-xs text-gray-500">Joining Date</label>
        <input
          type="date"
          value={form.joiningDate}
          onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))}
          className="w-full border rounded px-2 py-1"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={generateOffer}
          disabled={generating}
          className="px-3 py-2 bg-indigo-600 text-white rounded"
        >
          {generating ? "Generating..." : "Generate Offer"}
        </button>

        <button
          onClick={proceedNextRound}
          className="px-3 py-2 bg-green-600 text-white rounded"
        >
          Proceed to Next Round
        </button>

        <button
          onClick={() => navigate(`/candidates/${id}`)}
          className="px-3 py-2 border rounded"
        >
          Back
        </button>
      </div>

      {/* Latest Offer */}
      <div className="mt-6">
        <h3 className="font-semibold">Latest Offer</h3>
        {latestOffer ? (
          <div className="flex gap-2 mt-2">
            <button onClick={previewOffer} className="px-3 py-2 border rounded">
              Preview
            </button>
            <button onClick={downloadOffer} className="px-3 py-2 border rounded">
              Download
            </button>
            <button
              onClick={sendEmail}
              disabled={emailing}
              className="px-3 py-2 bg-blue-600 text-white rounded"
            >
              {emailing ? "Sending..." : "Send Email"}
            </button>
          </div>
        ) : (
          <div className="text-sm text-gray-500 mt-2">No offers generated yet.</div>
        )}
      </div>
    </div>
  );
}



// import React, { useEffect, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import api from "../api/axios";

// export default function OfferPage() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [candidate, setCandidate] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [generating, setGenerating] = useState(false);
//   const [emailing, setEmailing] = useState(false);
//   const [form, setForm] = useState({
//     designation: "",
//     ctc: "",
//     joiningDate: new Date().toISOString().slice(0, 10),
//   });
//   const [latestOffer, setLatestOffer] = useState(null);

//   // Fetch candidate and latest offer
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await api.get(`/candidates/${id}`);
//         setCandidate(res.data);
//         setForm((f) => ({ ...f, designation: res.data.Designation || f.designation }));

//         // Fetch latest offer
//         const offers = await api.get(`/candidates/${id}/offers`);
//         if (Array.isArray(offers.data) && offers.data.length > 0) {
//           setLatestOffer(offers.data[0]);
//         }
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [id]);

//   if (loading) return <div className="p-6">Loading...</div>;
//   if (!candidate) return <div className="p-6">Candidate not found</div>;

//   // Generate new offer
//   const generateOffer = async () => {
//     if (!window.confirm("Generate offer letter and mark candidate as offered?")) return;
//     setGenerating(true);
//     try {
//       const res = await api.post(`/candidates/${id}/offer/generate`, form);
//       const { offer, url } = res.data;

//       // Update latest offer
//       setLatestOffer(offer);

//       // Open generated PDF in new tab
//       if (url) window.open(url, "_blank");
//       else alert("Offer generated successfully. Preview/download from the Offers section.");

//     } catch (err) {
//       console.error(err);
//       alert(err?.response?.data?.message || "Offer generation failed");
//     } finally {
//       setGenerating(false);
//     }
//   };

//   // Preview offer in new tab
//   const previewOffer = () => {
//     if (!latestOffer) return alert("No offer to preview");
//     const url = `${window.location.origin}/offers/offer-${latestOffer._id}.pdf`;
//     window.open(url, "_blank");
//   };

//   // Download offer PDF
//   const downloadOffer = () => {
//     if (!latestOffer) return alert("No offer to download");
//     const url = `${window.location.origin}/offers/offer-${latestOffer._id}.pdf`;
//     window.open(url, "_blank");
//   };

//   // Send offer via email
//   const sendEmail = async () => {
//     if (!latestOffer) return alert("No offer to send");
//     if (!window.confirm(`Send offer to ${candidate.email}?`)) return;

//     setEmailing(true);
//     try {
//       await api.post(`/offers/${latestOffer._id}/send-email`, {
//         to: candidate.email,
//         subject: `Offer Letter from Company`,
//         message: `Hello ${candidate.firstName},\nPlease find attached your offer letter.\n\nRegards,\nHR`,
//       });
//       alert("Email sent successfully");
//     } catch (err) {
//       console.error(err);
//       alert(err?.response?.data?.message || "Failed to send email");
//     } finally {
//       setEmailing(false);
//     }
//   };

//   // Navigate to next round
//   const proceedNextRound = () => {
//     navigate(`/candidates/${id}/next-round`);
//   };

//   return (
//     <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow">
//       <h2 className="text-xl font-semibold mb-4">
//         Offer — {candidate.firstName} {candidate.lastName}
//       </h2>

//       {/* Offer form */}
//       <div className="grid grid-cols-1 gap-3">
//         <label className="text-xs text-gray-500">Designation</label>
//         <input
//           value={form.designation}
//           onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
//           className="w-full border rounded px-2 py-1"
//         />

//         <label className="text-xs text-gray-500">CTC</label>
//         <input
//           value={form.ctc}
//           onChange={(e) => setForm((f) => ({ ...f, ctc: e.target.value }))}
//           className="w-full border rounded px-2 py-1"
//         />

//         <label className="text-xs text-gray-500">Joining Date</label>
//         <input
//           type="date"
//           value={form.joiningDate}
//           onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))}
//           className="w-full border rounded px-2 py-1"
//         />
//       </div>

//       <div className="flex gap-2 mt-4">
//         <button
//           onClick={generateOffer}
//           disabled={generating}
//           className="px-3 py-2 bg-indigo-600 text-white rounded"
//         >
//           {generating ? "Generating..." : "Generate Offer"}
//         </button>

//         <button
//           onClick={proceedNextRound}
//           className="px-3 py-2 bg-green-600 text-white rounded"
//         >
//           Proceed to Next Round
//         </button>

//         <button
//           onClick={() => navigate(`/candidates/${id}`)}
//           className="px-3 py-2 border rounded"
//         >
//           Back
//         </button>
//       </div>

//       {/* Latest Offer */}
//       <div className="mt-6">
//         <h3 className="font-semibold">Latest Offer</h3>
//         {latestOffer ? (
//           <div className="flex gap-2 mt-2">
//             <button
//               onClick={previewOffer}
//               className="px-3 py-2 border rounded"
//             >
//               Preview
//             </button>
//             <button
//               onClick={downloadOffer}
//               className="px-3 py-2 border rounded"
//             >
//               Download
//             </button>
//             <button
//               onClick={sendEmail}
//               disabled={emailing}
//               className="px-3 py-2 bg-blue-600 text-white rounded"
//             >
//               {emailing ? "Sending..." : "Send Email"}
//             </button>
//           </div>
//         ) : (
//           <div className="text-sm text-gray-500 mt-2">
//             No offers generated yet.
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
