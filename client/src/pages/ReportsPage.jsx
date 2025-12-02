import React, { useEffect, useState } from "react";
import api from "../api/axios";

const SCORE_KEYS = ["grooming", "personality", "communication", "knowledge"];

export default function CandidateScores() {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [loadingRounds, setLoadingRounds] = useState(false);

  useEffect(() => {
    // Fetch all candidates for dropdown
    (async () => {
      try {
        const res = await api.get("/candidates");
        setCandidates(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCandidates(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedCandidate) {
      setRounds([]);
      return;
    }
    // Fetch rounds when a candidate is selected
    (async () => {
      setLoadingRounds(true);
      try {
        const res = await api.get(`/scores/${selectedCandidate}/rounds-detailed`);
        setRounds(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        setRounds([]);
      } finally {
        setLoadingRounds(false);
      }
    })();
  }, [selectedCandidate]);

  const totalScore = (scores) =>
    SCORE_KEYS.reduce((sum, k) => sum + Number(scores?.[k] || 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow">
      <h2 className="text-2xl font-semibold mb-4">Candidate Scores</h2>

      {/* Candidate selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-600 mb-1">Select Candidate</label>
        {loadingCandidates ? (
          <div className="text-gray-500">Loading candidates...</div>
        ) : (
          <select
            value={selectedCandidate || ""}
            onChange={(e) => setSelectedCandidate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">-- Select a candidate --</option>
            {candidates.map(c => (
              <option key={c._id} value={c._id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Rounds details */}
      {loadingRounds ? (
        <div className="text-gray-500">Loading rounds...</div>
      ) : !rounds.length ? (
        selectedCandidate && <div className="text-gray-500">No rounds found for this candidate.</div>
      ) : (
        <div className="space-y-4">
          {rounds.map(r => (
            <div key={r._id} className="border rounded-xl p-4 shadow-sm hover:shadow-md transition bg-white">
              <div className="flex justify-between items-center mb-3">
                <div className="font-medium text-gray-800">
                  {r.type} by {r.interviewer}
                </div>
                <div className="text-sm text-gray-500">{new Date(r.date).toLocaleDateString()}</div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-700">
                {SCORE_KEYS.map(k => (
                  <div key={k} className="capitalize">
                    {k}: {Number(r.scores?.[k] || 0)}
                  </div>
                ))}
              </div>

              <div className="mt-2 text-sm font-semibold text-gray-800">
                Total: {totalScore(r.scores)} / 40
              </div>

              {r.comments && (
                <div className="mt-1 text-xs text-gray-500">
                  Comments: {r.comments}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
