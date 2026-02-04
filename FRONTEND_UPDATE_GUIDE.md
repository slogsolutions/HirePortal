# 🎨 Frontend Update Guide - Performance System

## Overview

This guide explains how to update the Admin and Candidate frontend pages to work with the new cycle-based performance system.

---

## 🔧 Admin Page Updates (`PerformancePageAdmin.jsx`)

### **1. Update State Variables**

**REMOVE:**
```jsx
const [formData, setFormData] = useState({
  employee: "",
  period: "",              // ❌ REMOVE
  performanceScore: 3,
  feedback: "",
  nextReview: null,        // ❌ REMOVE
});
```

**REPLACE WITH:**
```jsx
const [formData, setFormData] = useState({
  employee: "",
  reviewForMonth: null,    // ✅ NEW: Month being reviewed
  performanceScore: 3,
  feedback: "",
  incentiveOverride: null, // ✅ NEW: Optional override
  penaltyOverride: null,   // ✅ NEW: Optional override
  overrideReason: "",      // ✅ NEW: Reason for override
});

const [cycles, setCycles] = useState([]);
const [selectedCycle, setSelectedCycle] = useState(null);
const [monthlySummaries, setMonthlySummaries] = useState({});
```

### **2. Update Fetch Functions**

**ADD:**
```jsx
const fetchCycles = async () => {
  try {
    const { data } = await api.get("/performance/cycles");
    setCycles(data?.data || []);
    
    // Set active cycle as default
    const activeCycle = (data?.data || []).find(c => c.status === 'active');
    if (activeCycle) {
      setSelectedCycle(activeCycle._id);
    }
  } catch (err) {
    console.error("fetchCycles error:", err);
  }
};

const fetchPerformancesByCycle = async (cycleId) => {
  try {
    const { data } = await api.get(`/performance?cycleId=${cycleId || ''}`);
    setPerformances(data?.data || []);
  } catch (err) {
    console.error("fetchPerformances error:", err);
  }
};
```

**UPDATE useEffect:**
```jsx
useEffect(() => {
  fetchCandidates();
  fetchCycles();
}, []);

useEffect(() => {
  if (selectedCycle) {
    fetchPerformancesByCycle(selectedCycle);
  }
}, [selectedCycle]);
```

### **3. Update Form Modal**

**REPLACE the form section with:**
```jsx
<form className="space-y-4" onSubmit={handleSubmit}>
  {/* Employee Select */}
  <select
    name="employee"
    value={formData.employee}
    onChange={handleChange}
    className="border border-gray-300 p-2 rounded-lg w-full"
    disabled={isEdit}
    required
  >
    <option value="">Select Candidate</option>
    {candidates.map((c) => (
      <option key={c._id} value={c._id}>
        {`${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unnamed"}
      </option>
    ))}
  </select>

  {/* ✅ NEW: Review For Month (replaces period) */}
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">
      Which month are you reviewing? *
    </label>
    <DatePicker
      selected={formData.reviewForMonth}
      onChange={(date) => setFormData(prev => ({ ...prev, reviewForMonth: date }))}
      dateFormat="MMMM yyyy"
      showMonthYearPicker
      placeholderText="Select month (e.g., January 2025)"
      className="border border-gray-300 p-2 rounded-lg w-full"
      required
    />
    <p className="text-xs text-gray-500 mt-1">
      Select the month you are evaluating (not when you're giving the review)
    </p>
  </div>

  {/* Performance Score */}
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">
      Performance Score *
    </label>
    <StarRating
      value={formData.performanceScore}
      setValue={(val) => setFormData(prev => ({ ...prev, performanceScore: val }))}
    />
    <div className="text-xs text-gray-500 mt-2 space-y-1">
      <div>5★ = ₹1,000 incentive | 4★ = ₹500 incentive</div>
      <div>3★ = No change | 2★ = ₹300 penalty | 1★ = ₹500 penalty</div>
    </div>
  </div>

  {/* Feedback */}
  <textarea
    name="feedback"
    placeholder="Feedback (required)"
    value={formData.feedback}
    onChange={handleChange}
    className="border border-gray-300 p-2 rounded-lg w-full"
    rows={4}
    required
  />

  {/* ✅ NEW: Optional Overrides */}
  <div className="border-t pt-4">
    <h4 className="text-sm font-semibold text-gray-700 mb-2">
      Override Financial Amounts (Optional)
    </h4>
    
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Incentive Override (₹)</label>
        <input
          type="number"
          name="incentiveOverride"
          value={formData.incentiveOverride || ''}
          onChange={handleChange}
          placeholder="Leave empty for default"
          className="border border-gray-300 p-2 rounded-lg w-full"
          min="0"
        />
      </div>
      
      <div>
        <label className="block text-xs text-gray-600 mb-1">Penalty Override (₹)</label>
        <input
          type="number"
          name="penaltyOverride"
          value={formData.penaltyOverride || ''}
          onChange={handleChange}
          placeholder="Leave empty for default"
          className="border border-gray-300 p-2 rounded-lg w-full"
          min="0"
        />
      </div>
    </div>
    
    {(formData.incentiveOverride || formData.penaltyOverride) && (
      <div className="mt-2">
        <label className="block text-xs text-gray-600 mb-1">Reason for Override</label>
        <input
          type="text"
          name="overrideReason"
          value={formData.overrideReason}
          onChange={handleChange}
          placeholder="Why are you overriding the default amount?"
          className="border border-gray-300 p-2 rounded-lg w-full"
        />
      </div>
    )}
  </div>

  {/* Buttons */}
  <div className="flex justify-end gap-3 mt-4">
    <button 
      type="button" 
      className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300" 
      onClick={() => setShowModal(false)}
    >
      Cancel
    </button>
    <button 
      type="submit" 
      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
    >
      {isEdit ? "Update Review" : "Save Review"}
    </button>
  </div>
</form>
```

### **4. Update handleSubmit**

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!formData.employee) return alert("Select a candidate");
  if (!formData.reviewForMonth) return alert("Select which month you are reviewing");
  if (!formData.feedback.trim()) return alert("Feedback is required");
  
  try {
    const submitData = {
      reviewForMonth: formData.reviewForMonth.toISOString(),
      performanceScore: formData.performanceScore,
      feedback: formData.feedback.trim(),
    };
    
    // Add overrides if provided
    if (formData.incentiveOverride) {
      submitData.incentiveOverride = parseFloat(formData.incentiveOverride);
    }
    if (formData.penaltyOverride) {
      submitData.penaltyOverride = parseFloat(formData.penaltyOverride);
    }
    if (formData.overrideReason) {
      submitData.overrideReason = formData.overrideReason.trim();
    }

    if (isEdit && selectedPerformance) {
      await api.put(`/performance/${selectedPerformance._id}`, submitData);
    } else {
      const response = await api.post(`/performance/${formData.employee}`, submitData);
      
      // Show warning if notice period triggered
      if (response.data.warning) {
        alert(response.data.message);
      }
    }

    // Reset form
    setFormData({ 
      employee: "", 
      reviewForMonth: null,
      performanceScore: 3, 
      feedback: "",
      incentiveOverride: null,
      penaltyOverride: null,
      overrideReason: ""
    });
    setSelectedPerformance(null);
    setIsEdit(false);
    setShowModal(false);
    
    await fetchPerformancesByCycle(selectedCycle);
  } catch (err) {
    console.error("handleSubmit error:", err);
    const errorMsg = err.response?.data?.message || "Failed to save performance";
    alert(errorMsg);
  }
};
```

### **5. Add Cycle Selector to UI**

**Add before the "Add Performance" button:**
```jsx
{/* Cycle Selector */}
<div className="flex flex-wrap gap-4 mb-6 items-center">
  <div className="flex-1 min-w-[200px]">
    <label className="block text-sm font-semibold text-gray-700 mb-1">
      Performance Cycle
    </label>
    <select
      value={selectedCycle || ''}
      onChange={(e) => setSelectedCycle(e.target.value)}
      className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none"
    >
      <option value="">All Cycles</option>
      {cycles.map((cycle) => (
        <option key={cycle._id} value={cycle._id}>
          Cycle {cycle.cycleNumber}: {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
          {cycle.status === 'active' ? ' (Active)' : ' (Closed)'}
        </option>
      ))}
    </select>
  </div>
  
  <input
    type="text"
    placeholder="Search employee..."
    className="border p-2 rounded-lg flex-1 focus:ring-2 focus:ring-indigo-500 outline-none"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
  />
  
  <button
    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
    onClick={() => { setShowModal(true); setIsEdit(false); }}
  >
    Add Performance Review
  </button>
</div>
```

### **6. Update Employee Detail View**

**Replace the expanded employee details section with:**
```jsx
{expandedEmployee && grouped[expandedEmployee] && (
  <motion.div
    className="fixed top-[64px] right-0 h-[calc(100%-64px)] w-full md:w-1/2 bg-white shadow-lg p-6 z-40 overflow-y-auto dark:bg-slate-800"
    initial={{ x: "100%" }}
    animate={{ x: 0 }}
    exit={{ x: "100%" }}
  >
    <button
      className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold"
      onClick={() => setExpandedEmployee(null)}
    >
      ×
    </button>

    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">{grouped[expandedEmployee].employeeName}</h2>
      
      {/* Cycle Summary */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-lg mb-3">Cycle Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Reviews:</span>
            <span className="font-bold ml-2">{grouped[expandedEmployee].records.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Average Score:</span>
            <span className="font-bold ml-2">{grouped[expandedEmployee].average?.toFixed(1)}/5</span>
          </div>
          <div className="col-span-2">
            <FinancialDisplay 
              incentives={grouped[expandedEmployee].totalIncentives || 0}
              penalties={grouped[expandedEmployee].totalPenalties || 0}
              net={grouped[expandedEmployee].netAmount || 0}
            />
          </div>
        </div>
      </div>

      {/* Individual Reviews */}
      <h3 className="font-semibold text-lg mb-3">Review History</h3>
      <div className="space-y-4">
        {grouped[expandedEmployee].records
          .sort((a, b) => new Date(b.reviewDate) - new Date(a.reviewDate))
          .map((review, idx) => (
          <div key={idx} className="border rounded-lg p-4 hover:shadow-md transition">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="font-semibold text-gray-900">
                  Review for: {review.reviewForMonth ? format(new Date(review.reviewForMonth), 'MMMM yyyy') : 'N/A'}
                </div>
                <div className="text-sm text-gray-500">
                  Given on: {review.reviewDate ? format(new Date(review.reviewDate), 'MMM dd, yyyy') : 'N/A'}
                </div>
              </div>
              <div className="text-right">
                <Stars value={review.performanceScore || 0} />
                <PerformanceTag tag={review.performanceTag || 'Average'} className="mt-1" />
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded mb-3">
              <div className="text-sm font-semibold text-gray-700 mb-1">Feedback:</div>
              <div className="text-sm text-gray-700">{review.feedback || 'N/A'}</div>
            </div>
            
            <FinancialDisplay 
              incentives={review.incentiveAmount || 0}
              penalties={review.penaltyAmount || 0}
              net={(review.incentiveAmount || 0) - (review.penaltyAmount || 0)}
              className="mb-2"
            />
            
            {review.overrideReason && (
              <div className="text-xs text-blue-600 mb-2">
                Override reason: {review.overrideReason}
              </div>
            )}
            
            <div className="flex gap-2 mt-3">
              <button
                className="bg-yellow-400 px-3 py-1 rounded hover:bg-yellow-500 text-white text-sm"
                onClick={() => handleEdit(review)}
              >
                Edit
              </button>
              <button
                className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 text-white text-sm"
                onClick={() => handleDelete(review._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
)}
```

---

## 👤 Candidate Page Updates (`MyPerformancePage.jsx`)

### **1. Update State and Data Fetching**

```jsx
const [currentCycle, setCurrentCycle] = useState(null);
const [selectedCycleId, setSelectedCycleId] = useState(null);
const [availableCycles, setAvailableCycles] = useState([]);
const [monthlySummaries, setMonthlySummaries] = useState([]);
const [cycleSummary, setCycleSummary] = useState(null);

async function loadPerformanceData(cycleId = null) {
  try {
    const url = cycleId ? `/performance/me?cycleId=${cycleId}` : '/performance/me';
    const perfRes = await api.get(url);
    
    const data = perfRes.data?.data || {};
    setCurrentCycle(data.currentCycle || null);
    setPerformances(data.reviews || []);
    setMonthlySummaries(data.monthlySummaries || []);
    setCycleSummary(data.cycleSummary || null);
    setAvailableCycles(data.availableCycles || []);
  } catch (err) {
    console.error("Failed to load performance data:", err);
  }
}

useEffect(() => {
  loadAll();
  loadPerformanceData();
}, []);

useEffect(() => {
  if (selectedCycleId) {
    loadPerformanceData(selectedCycleId);
  }
}, [selectedCycleId]);
```

### **2. Add Cycle Selector**

```jsx
{/* Cycle Selector */}
{availableCycles.length > 0 && (
  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow mb-6">
    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
      Select Performance Cycle
    </label>
    <select
      value={selectedCycleId || currentCycle?._id || ''}
      onChange={(e) => setSelectedCycleId(e.target.value)}
      className="border p-2 rounded-lg w-full focus:ring-2 focus:ring-indigo-500 outline-none"
    >
      {availableCycles.map((cycle) => (
        <option key={cycle._id} value={cycle._id}>
          Cycle {cycle.cycleNumber}: {format(new Date(cycle.startDate), 'MMM yyyy')} - {format(new Date(cycle.endDate), 'MMM yyyy')}
          {cycle.status === 'active' ? ' (Current)' : ''}
        </option>
      ))}
    </select>
  </div>
)}
```

### **3. Add Warning Banner**

```jsx
{/* Warning Banner */}
{cycleSummary?.hadNoticePeriodWarning && (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-red-100 border-2 border-red-500 rounded-xl p-6 mb-6"
  >
    <div className="flex items-center gap-4">
      <div className="text-4xl">🚨</div>
      <div>
        <h3 className="text-xl font-bold text-red-800">Notice Period Warning</h3>
        <p className="text-red-700 mt-1">
          You have received low performance ratings for 2 consecutive months.
          Please schedule a meeting with HR to discuss your performance improvement plan.
        </p>
      </div>
    </div>
  </motion.div>
)}
```

### **4. Update Review Display**

```jsx
{performances.map((perf, idx) => (
  <motion.div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
          <FaCalendarAlt className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Review #{performances.length - idx}
          </h3>
          <p className="text-sm font-semibold text-indigo-600">
            For: {perf.reviewForMonth ? format(new Date(perf.reviewForMonth), 'MMMM yyyy') : 'N/A'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Given on: {perf.reviewDate ? format(new Date(perf.reviewDate), 'MMM dd, yyyy') : 'N/A'}
          </p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          {Number(perf.performanceScore || 0).toFixed(1)}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">/ 5.0</div>
        <div className="mt-1">
          <Stars value={perf.performanceScore || 0} />
        </div>
        <div className="mt-2">
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            perf.performanceTag === 'Outstanding' ? 'bg-green-500 text-white' :
            perf.performanceTag === 'Very Good' ? 'bg-blue-500 text-white' :
            perf.performanceTag === 'Average' ? 'bg-yellow-500 text-white' :
            perf.performanceTag === 'Below Average' ? 'bg-orange-500 text-white' :
            'bg-red-500 text-white'
          }`}>
            {perf.performanceTag || 'Average'}
          </span>
        </div>
      </div>
    </div>

    {/* Financial Info */}
    <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-lg mb-3">
      <div className="flex justify-between text-sm">
        {perf.incentiveAmount > 0 && (
          <span className="text-green-600 font-semibold">
            Incentive: +₹{perf.incentiveAmount.toLocaleString()}
          </span>
        )}
        {perf.penaltyAmount > 0 && (
          <span className="text-red-600 font-semibold">
            Penalty: -₹{perf.penaltyAmount.toLocaleString()}
          </span>
        )}
        <span className={`font-bold ${
          (perf.incentiveAmount - perf.penaltyAmount) >= 0 ? 'text-green-700' : 'text-red-700'
        }`}>
          Net: ₹{((perf.incentiveAmount || 0) - (perf.penaltyAmount || 0)).toLocaleString()}
        </span>
      </div>
    </div>

    {/* Feedback */}
    {perf.feedback && (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Feedback:</h4>
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
          {perf.feedback}
        </p>
      </div>
    )}

    {/* Reviewer Info */}
    {perf.reviewer && (
      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        Reviewed by: <span className="font-semibold">{perf.reviewer?.name || perf.reviewer?.email || "Unknown"}</span>
      </div>
    )}
  </motion.div>
))}
```

---

## ✅ Testing Checklist

After making these changes:

- [ ] Admin can select "reviewForMonth" (month being reviewed)
- [ ] Admin can see cycle selector
- [ ] Admin can add optional financial overrides
- [ ] Admin sees warning when creating review that triggers notice period
- [ ] Candidate sees cycle selector
- [ ] Candidate sees "Review for: [Month]" in each review
- [ ] Candidate sees warning banner if flagged
- [ ] Candidate sees financial information (incentives/penalties)
- [ ] Both see performance tags (Outstanding, Very Good, etc.)
- [ ] Leaderboard works with cycle filter

---

## 🚀 Deployment Steps

1. **Backend First:**
   - Deploy new models and controllers
   - Run migration script: `node server/scripts/migratePerformanceToNewSystem.js`
   - Verify data migrated correctly

2. **Frontend:**
   - Update Admin page with changes above
   - Update Candidate page with changes above
   - Test thoroughly in development

3. **Production:**
   - Deploy backend
   - Run migration
   - Deploy frontend
   - Monitor for issues

---

## 📞 Need Help?

Refer to:
- `PERFORMANCE_SYSTEM_IMPLEMENTATION.md` for complete backend documentation
- Model files for field definitions
- Controller files for API endpoint details
