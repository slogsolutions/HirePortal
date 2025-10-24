import React, { useEffect, useState } from "react";
import api from "../api/axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Clickable Star Rating for forms
const StarRating = ({ value, setValue }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        className={`cursor-pointer text-2xl ${
          i <= value ? "text-yellow-500" : "text-gray-300"
        }`}
        onClick={() => setValue(i)}
      >
        ★
      </span>
    );
  }
  return <div className="flex space-x-1">{stars}</div>;
};

// Read-only stars for display
const Stars = ({ value }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <span
        key={i}
        className={i <= value ? "text-yellow-500" : "text-gray-300"}
      >
        ★
      </span>
    );
  }
  return <div>{stars}</div>;
};

const AdminPerformancePage = () => {
  const [performances, setPerformances] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [search, setSearch] = useState("");
  const [filterScore, setFilterScore] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employee: "",
    period: "",
    performanceScore: 3,
    feedback: "",
    nextReview: null,
  });
  const [selectedPerformance, setSelectedPerformance] = useState(null);
  const [isEdit, setIsEdit] = useState(false);

  // Fetch candidates and performances
  const fetchCandidates = async () => {
    try {
      const { data } = await api.get("/candidates");
      setCandidates(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPerformances = async () => {
    try {
      const { data } = await api.get("/performance");
      setPerformances(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCandidates();
    fetchPerformances();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({ ...prev, nextReview: date }));
  };

  // Open modal for editing
  const handleEdit = (performance) => {
    setFormData({
      employee: performance.employee._id,
      period: performance.period,
      performanceScore: performance.performanceScore,
      feedback: performance.feedback,
      nextReview: performance.nextReview
        ? new Date(performance.nextReview)
        : null,
    });
    setSelectedPerformance(performance);
    setIsEdit(true);
    setShowModal(true);
  };

  // Delete performance
  const handleDelete = async (performanceId) => {
    if (!window.confirm("Are you sure you want to delete this performance?"))
      return;

    try {
      await api.delete(`/performance/${performanceId}`);
      fetchPerformances();
      setSelectedPerformance(null);
    } catch (err) {
      console.error(err);
    }
  };

  // Submit new or edited performance
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.employee) return alert("Select a candidate");

    try {
      const stored = JSON.parse(localStorage.getItem("auth:v1"));
      const reviewerId = stored?.user?._id || stored?.user?.id;

      if (isEdit && selectedPerformance) {
        // Update
        await api.put(`/performance/${selectedPerformance._id}`, {
          ...formData,
          reviewer: reviewerId,
        });
      } else {
        // Create
        await api.post(`/performance/${formData.employee}`, {
          ...formData,
          reviewer: reviewerId,
        });
      }

      setFormData({
        employee: "",
        period: "",
        performanceScore: 3,
        feedback: "",
        nextReview: null,
      });
      setSelectedPerformance(null);
      setIsEdit(false);
      setShowModal(false);
      fetchPerformances();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = performances.filter((p) => {
    const matchesCandidate =
      !search ||
      p.employee.firstName.toLowerCase().includes(search.toLowerCase()) ||
      p.employee.lastName.toLowerCase().includes(search.toLowerCase());
    const matchesScore =
      !filterScore || p.performanceScore === Number(filterScore);
    return matchesCandidate && matchesScore;
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Employee Performance Admin</h1>

      {/* Filters */}
      <div className="flex space-x-4 mb-4">
        <input
          type="text"
          placeholder="Search candidate..."
          className="border p-2 rounded flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border p-2 rounded"
          value={filterScore}
          onChange={(e) => setFilterScore(e.target.value)}
        >
          <option value="">All Scores</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          onClick={() => {
            setShowModal(true);
            setIsEdit(false);
          }}
        >
          Add New
        </button>
      </div>

      {/* Performance List */}
 
<div className="bg-white shadow rounded p-4">
  {filtered.length === 0 && <p>No performances found</p>}
  {filtered.map((p) => (
    <div
      key={p._id}
      className="border-b p-2 flex justify-between items-center hover:bg-gray-100"
    >
      {/* Clickable area for details */}
      <div
        className="cursor-pointer flex-1"
        onClick={() => setSelectedPerformance(p)}
      >
        <p className="font-bold">
          {p.employee.firstName} {p.employee.lastName}
        </p>
        <Stars value={p.performanceScore} />
      </div>

      {/* Buttons */}
      <div className="flex space-x-2">
        <p className="self-center">{p.period}</p>
        <button
          className="bg-yellow-400 px-2 py-1 rounded hover:bg-yellow-500 text-white"
          onClick={(e) => {
            e.stopPropagation(); // prevent details click
            handleEdit(p);
          }}
        >
          Edit
        </button>
        <button
          className="bg-red-500 px-2 py-1 rounded hover:bg-red-600 text-white"
          onClick={(e) => {
            e.stopPropagation(); // prevent details click
            handleDelete(p._id);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  ))}
</div>


      {/* Performance Details */}
      {selectedPerformance && (
        <div className="mt-4 bg-white shadow rounded p-4">
          <h2 className="text-xl font-bold mb-2">Performance Details</h2>
          <p>
            <strong>Candidate:</strong> {selectedPerformance.employee.firstName}{" "}
            {selectedPerformance.employee.lastName}
          </p>
          <p>
            <strong>Reviewer:</strong> {selectedPerformance.reviewer.name}
          </p>
          <p>
            <strong>Period:</strong> {selectedPerformance.period}
          </p>
          <p>
            <strong>Score:</strong>{" "}
            <Stars value={selectedPerformance.performanceScore} />
          </p>
          <p>
            <strong>Feedback:</strong> {selectedPerformance.feedback}
          </p>
          <p>
            <strong>Next Review:</strong>{" "}
            {selectedPerformance.nextReview
              ? new Date(selectedPerformance.nextReview).toLocaleDateString()
              : "N/A"}
          </p>
          <button
            className="mt-2 bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
            onClick={() => setSelectedPerformance(null)}
          >
            Close
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex justify-center items-center z-50
               bg-white/20 backdrop-blur-md animate-fadeIn"
        >
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-md animate-scaleUp">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              {isEdit ? "Edit Performance" : "Add New Performance"}
            </h2>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <select
                name="employee"
                value={formData.employee}
                onChange={handleChange}
                className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                disabled={isEdit} // cannot change employee when editing
              >
                <option value="">Select Candidate</option>
                {candidates.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>

              <input
                type="text"
                name="period"
                placeholder="Period (e.g., Jan 2025)"
                value={formData.period}
                onChange={handleChange}
                className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />

              <StarRating
                value={formData.performanceScore}
                setValue={(val) =>
                  setFormData((prev) => ({ ...prev, performanceScore: val }))
                }
              />

              <textarea
                name="feedback"
                placeholder="Feedback"
                value={formData.feedback}
                onChange={handleChange}
                className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />

              <DatePicker
                selected={formData.nextReview}
                onChange={handleDateChange}
                placeholderText="Next Review Date"
                className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />

              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  {isEdit ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPerformancePage;
