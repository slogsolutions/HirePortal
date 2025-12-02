import React, { useEffect, useState } from 'react';
import api from '../api/axios';

const CandidateDropdown = ({ selected, setSelected }) => {
  const [candidates, setCandidates] = useState([]);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const { data } = await api.get('/candidates');
        setCandidates(data);
      } catch (err) {
        console.error('Failed to fetch candidates', err);
      }
    };
    fetchCandidates();
  }, []);

  return (
    <select
      className="border p-2 rounded"
      value={selected || ''}
      onChange={(e) => setSelected(e.target.value)}
    >
      <option value="">All Candidates</option>
      {candidates.map((c) => (
        <option key={c._id} value={c._id}>
          {c.firstName} {c.lastName}
        </option>
      ))}
    </select>
  );
};

export default CandidateDropdown;
