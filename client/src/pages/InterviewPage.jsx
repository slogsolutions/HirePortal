// import React, { useEffect, useState } from "react";
// import { useParams, useNavigate } from "react-router-dom";
// import api from "../api/axios";

// const ROUND_TYPES = ["HR", "Technical", "Director", "Round 1", "Round 2", "Round 3"];

// export default function InterviewPage() {
//   const { id } = useParams();
//   const navigate = useNavigate();
//   const [candidate, setCandidate] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);

//   const [round, setRound] = useState({
//     interviewer: "",
//     type: "HR",
//     scores: { grooming: 0, personality: 0, communication: 0, knowledge: 0 },
//     comments: "",
//     date: new Date().toISOString().slice(0, 10),
//   });

//   const [rounds, setRounds] = useState([]);

//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await api.get(`/candidates/${id}`);
//         setCandidate(res.data);
//         // fetch existing rounds
//         const rr = await api.get(`/candidates/${id}/interviews`);
//         setRounds(Array.isArray(rr.data) ? rr.data : []);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [id]);

//   if (loading) return <div className="p-6">Loading...</div>;
//   if (!candidate) return <div className="p-6">Candidate not found</div>;

//   const handleScoreChange = (k, val) => {
//     // digit-by-digit safe update: ensure int between 0..10
//     const n = Math.max(0, Math.min(10, Number(val || 0)));
//     setRound((r) => ({ ...r, scores: { ...r.scores, [k]: n } }));
//   };

//   const saveRound = async () => {
//     // require interviewer and type
//     if (!round.interviewer) return alert("Enter interviewer name");
//     setSaving(true);
//     try {
//       const payload = { ...round };
//       await api.post(`/candidates/${id}/interviews`, payload);
//       const rr = await api.get(`/candidates/${id}/interviews`);
//       setRounds(Array.isArray(rr.data) ? rr.data : []);
//       // reset a bit
//       setRound((r) => ({ ...r, interviewer: "", comments: "" }));
//       alert("Round saved");
//     } catch (err) {
//       console.error(err);
//       alert(err?.response?.data?.message || "Save failed");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const submitFinal = async () => {
//     if (!window.confirm("Submit final and move candidate to 'offered'?")) return;
//     setSaving(true);
//     try {
//       // maybe backend composes scores/decides offer. We'll just update status.
//       await api.put(`/candidates/${id}`, { status: "offered" });
//       alert("Candidate moved to offered");
//       navigate(`/candidates/${id}`);
//     } catch (err) {
//       console.error(err);
//       alert(err?.response?.data?.message || "Final submit failed");
//     } finally {
//       setSaving(false);
//     }
//   };

//   const totalScore = (s) => Object.values(s).reduce((a, b) => a + Number(b || 0), 0);

//   return (
//     <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow">
//       <h2 className="text-xl font-semibold mb-4">Interview — {candidate.firstName} {candidate.lastName}</h2>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//         <div className="space-y-2">
//           <label className="text-xs text-gray-500">Interviewer</label>
//           <input value={round.interviewer} onChange={(e) => setRound((r) => ({ ...r, interviewer: e.target.value }))} className="w-full border rounded px-2 py-1" />

//           <label className="text-xs text-gray-500 mt-2">Round Type</label>
//           <select value={round.type} onChange={(e) => setRound((r) => ({ ...r, type: e.target.value }))} className="w-full border rounded px-2 py-1">
//             {ROUND_TYPES.map((rt) => <option key={rt} value={rt}>{rt}</option>)}
//           </select>

//           <label className="text-xs text-gray-500 mt-2">Date</label>
//           <input type="date" value={round.date} onChange={(e) => setRound((r) => ({ ...r, date: e.target.value }))} className="w-full border rounded px-2 py-1" />
//         </div>

//         <div>
//           <div className="text-sm font-medium">Scores (0 - 10)</div>
//           {["grooming","personality","communication","knowledge"].map((k) => (
//             <div key={k} className="mt-2">
//               <div className="flex justify-between text-xs text-gray-500">
//                 <div>{k.charAt(0).toUpperCase()+k.slice(1)}</div>
//                 <div>{round.scores[k]}</div>
//               </div>
//               <input type="number" min="0" max="10" value={round.scores[k]} onChange={(e) => handleScoreChange(k, e.target.value)} className="w-full border rounded px-2 py-1" />
//             </div>
//           ))}
//           <div className="mt-3 text-sm">Total: {totalScore(round.scores)} / 40</div>
//         </div>
//       </div>

//       <div className="mt-3">
//         <label className="text-xs text-gray-500">Comments</label>
//         <textarea value={round.comments} onChange={(e) => setRound((r) => ({ ...r, comments: e.target.value }))} className="w-full border rounded px-2 py-1" />
//       </div>

//       <div className="flex gap-2 mt-4">
//         <button onClick={saveRound} disabled={saving} className="px-3 py-2 bg-indigo-600 text-white rounded">
//           {saving ? "Saving..." : "Save Round"}
//         </button>
//         <button onClick={submitFinal} disabled={saving} className="px-3 py-2 bg-green-600 text-white rounded">
//           {saving ? "Processing..." : "Submit Final (Offer)"}
//         </button>
//         <button onClick={() => navigate(`/candidates/${id}`)} className="px-3 py-2 border rounded">Back</button>
//       </div>

//       <div className="mt-6">
//         <h3 className="font-semibold mb-2">Saved Rounds</h3>
//         {rounds.length === 0 ? (
//           <div className="text-sm text-gray-500">No rounds yet</div>
//         ) : (
//           rounds.map((r) => (
//             <div key={r._id || r.id} className="border rounded p-3 mb-2">
//               <div className="flex justify-between">
//                 <div><strong>{r.type}</strong> by {r.interviewer}</div>
//                 <div>{new Date(r.date).toLocaleDateString()}</div>
//               </div>
//               <div className="text-sm">Scores: {Object.entries(r.scores).map(([k,v]) => `${k}:${v}`).join(" | ")} — Total: {totalScore(r.scores)}</div>
//               <div className="mt-1 text-xs text-gray-600">{r.comments}</div>
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   );
// }

//for profile 

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";

const ROUND_TYPES = ["HR", "Technical", "Director", "Round 1", "Round 2", "Round 3"];
const SCORE_KEYS = ["grooming", "personality", "communication", "knowledge"];

export default function InterviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [round, setRound] = useState({
    interviewer: "",
    type: "HR",
    scores: { grooming: 0, personality: 0, communication: 0, knowledge: 0 },
    comments: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const [rounds, setRounds] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/candidates/${id}`);
        setCandidate(res.data);
        const rr = await api.get(`/candidates/${id}/interviews`);
        setRounds(Array.isArray(rr.data) ? rr.data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;
  if (!candidate) return <div className="p-6 text-center text-gray-500">Candidate not found</div>;

  const handleScoreChange = (key, value) => {
    const n = Math.max(0, Math.min(10, Number(value || 0)));
    setRound(r => ({ ...r, scores: { ...r.scores, [key]: n } }));
  };

  const totalScore = (scores) =>
    SCORE_KEYS.reduce((sum, k) => sum + Number(scores?.[k] || 0), 0);

  const saveRound = async () => {
    if (!round.interviewer) return alert("Enter interviewer name");
    setSaving(true);
    try {
      await api.post(`/candidates/${id}/interviews`, round);
      const rr = await api.get(`/candidates/${id}/interviews`);
      setRounds(Array.isArray(rr.data) ? rr.data : []);
      setRound(r => ({ ...r, interviewer: "", comments: "" }));
      alert("Round saved");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const submitFinal = async () => {
    if (!window.confirm("Submit final and move candidate to 'offered'?")) return;
    setSaving(true);
    try {
      await api.put(`/candidates/${id}`, { status: "offered" });
      alert("Candidate moved to offered");
      navigate(`/candidates/${id}`);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Final submit failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-md dark:bg-slate-900">
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 dark:bg-slate-900">
          <button
            onClick={() => navigate(`/candidates/${id}`)}
            className="text-sm text-indigo-600 hover:underline flex items-center gap-1 "
          >
            <span className="text-lg">&larr;</span> Back
          </button>
        </div>
      <h2 className="text-2xl font-semibold mb-6">Interview — {candidate.firstName} {candidate.lastName}</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">Interviewer</label>
            <input
              value={round.interviewer}
              onChange={e => setRound(r => ({ ...r, interviewer: e.target.value }))}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:bg-slate-900">Round Type</label>
            <select
              value={round.type}
              onChange={e => setRound(r => ({ ...r, type: e.target.value }))}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:bg-slate-900"
            >
              {ROUND_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Date</label>
            <input
              type="date"
              value={round.date}
              onChange={e => setRound(r => ({ ...r, date: e.target.value }))}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-sm font-medium text-gray-700">Scores (0-10)</div>
          {SCORE_KEYS.map(k => (
            <div key={k} className="flex items-center justify-between">
              <label className="capitalize text-gray-600">{k}</label>
              <input
                type="number"
                min="0"
                max="10"
                value={round.scores[k]}
                onChange={e => handleScoreChange(k, e.target.value)}
                className="w-20 border border-gray-300 rounded px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          ))}
          <div className="mt-2 font-semibold text-gray-700">Total: {totalScore(round.scores)} / 40</div>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-600">Comments</label>
        <textarea
          value={round.comments}
          onChange={e => setRound(r => ({ ...r, comments: e.target.value }))}
          className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={saveRound} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          {saving ? "Saving..." : "Save Round"}
        </button>
        <button onClick={submitFinal} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
          {saving ? "Processing..." : "Submit Final (Offer)"}
        </button>
        <button onClick={() => navigate(`/candidates/${id}`)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-red-900 dark:bg-red-700">
          Back
        </button>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-3">Saved Rounds</h3>
        {rounds.length === 0 ? (
          <div className="text-gray-500">No rounds yet</div>
        ) : (
          <div className="space-y-3">
            {rounds.map(r => (
              <div key={r._id || r.id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium">{r.type} by {r.interviewer}</span>
                  <span className="text-sm text-gray-500">{new Date(r.date).toLocaleDateString()}</span>
                </div>
                <div className="text-sm text-gray-700">
                  Scores: {SCORE_KEYS.map(k => `${k}:${r.scores?.[k] ?? 0}`).join(" | ")} — Total: {totalScore(r.scores)}
                </div>
                {r.comments && <div className="mt-1 text-xs text-gray-500">{r.comments}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
