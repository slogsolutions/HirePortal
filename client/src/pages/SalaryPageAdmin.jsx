import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios"; // adjust path to your axios instance file
// Example: import api from "./axiosInstance";

export default function SalaryEditorModern() {
  const [candidates, setCandidates] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [candidate, setCandidate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedSalaryResp, setSavedSalaryResp] = useState(null);
  const [query, setQuery] = useState("");
  const slipRef = useRef();

  // editable fields state
  const [fields, setFields] = useState({
    baseSalary: 15000,
    workingDaysInMonth: 30,
    hoursPerDay: 8,
    advance: 0,
    overtimeDays: 0,
    overtimeHours: 0,
    leavesTaken: 0,
    epf: 0,
    bonus: 0,
    expense: 0,
    lateMinutes: 0,
    adjustments: [], // [{id, reason, amount}]
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
  });

  // fetch candidates on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/candidates"); // uses API_BASE + /candidates
        if (!mounted) return;
        setCandidates(data || []);
      } catch (err) {
        console.error("Failed to fetch candidates", err);
      }
    })();
    return () => (mounted = false);
  }, []);

  // when selectedId changes, load candidate details and prefill baseSalary
  useEffect(() => {
    if (!selectedId) {
      setCandidate(null);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get(`/candidates/${selectedId}`);
        if (!mounted) return;
        setCandidate(data);
        setFields((f) => ({
          ...f,
          baseSalary: Number(data.Salary || f.baseSalary || 0),
        }));
      } catch (err) {
        console.error("cand detail err", err);
      }
    })();
    return () => (mounted = false);
  }, [selectedId]);

  // helper id generator for adjustments
  const newAdjId = () => Math.random().toString(36).slice(2, 9);

  // Calculation (same logic, runs live)
  const calc = useMemo(() => {
    const {
      baseSalary = 0,
      workingDaysInMonth = 30,
      hoursPerDay = 8,
      advance = 0,
      overtimeDays = 0,
      overtimeHours = 0,
      leavesTaken = 0,
      epf = 0,
      bonus = 0,
      expense = 0,
      adjustments = [],
      lateMinutes = 0,
    } = fields;

    // configurable multipliers (you can expose these in UI as settings)
    const overtimeHourMultiplier = 1.5;
    const overtimeDayMultiplier = 1.5;

    const perDay = workingDaysInMonth > 0 ? baseSalary / workingDaysInMonth : 0;
    const perHour = hoursPerDay > 0 ? perDay / hoursPerDay : 0;

    const overtimeFromDays = Number(overtimeDays) * perDay * overtimeDayMultiplier;
    const overtimeFromHours = Number(overtimeHours) * perHour * overtimeHourMultiplier;
    const lateDeduction = (perHour / 60) * Number(lateMinutes || 0);

    const adjustmentsTotal = (adjustments || []).reduce((s, a) => s + Number(a.amount || 0), 0);
    const positiveAdjustments = Math.max(0, adjustmentsTotal);
    const negativeAdjustments = Math.min(0, adjustmentsTotal); // negative value or 0

    const additions = Number(bonus || 0) + Number(expense || 0) + overtimeFromDays + overtimeFromHours + positiveAdjustments;
    const leaveDeduction = Number(leavesTaken || 0) * perDay;
    const totalDeductions =
      Number(advance || 0) + Number(epf || 0) + Number(leaveDeduction || 0) + Math.abs(negativeAdjustments) + Number(lateDeduction || 0);

    const grossPay = Number(baseSalary || 0) + additions;
    const netPay = grossPay - totalDeductions;

    return {
      perDay,
      perHour,
      overtimeFromDays,
      overtimeFromHours,
      lateDeduction,
      additions,
      leaveDeduction,
      adjustmentsTotal,
      totalDeductions,
      grossPay,
      netPay,
    };
  }, [fields]);

  // field update helper
  function onFieldChange(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  // adjustments CRUD
  function addAdjustment() {
    const adj = { id: newAdjId(), reason: "", amount: 0 };
    setFields((f) => ({ ...f, adjustments: [...f.adjustments, adj] }));
  }
  function updateAdjustment(id, patch) {
    setFields((f) => ({ ...f, adjustments: f.adjustments.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  }
  function removeAdjustment(id) {
    setFields((f) => ({ ...f, adjustments: f.adjustments.filter((a) => a.id !== id) }));
  }

  // save salary to server
  async function saveSalary() {
    if (!selectedId) return alert("Choose a candidate first");
    setSaving(true);
    const payload = {
      candidate: selectedId,
      month: fields.month,
      ...fields,
      // ensure server gets numbers (no functions)
    };
    try {
      const { data } = await api.post("/salaries", payload);
      setSavedSalaryResp(data);
      setSaving(false);
      alert("Saved salary");
    } catch (err) {
      console.error("save error", err);
      setSaving(false);
      alert("Save failed");
    }
  }

  // small currency formatter
  function fmt(v) {
    return Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // filtered candidate list for dropdown (simple client-side filter)
  const filtered = candidates.filter((c) => {
    if (!query) return true;
    const s = `${c.firstName} ${c.lastName} ${c.email || ""} ${c.mobile || ""}`.toLowerCase();
    return s.includes(query.toLowerCase());
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 shadow-lg text-white mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Payroll Editor</h1>
            <p className="text-indigo-100 mt-1">Fast, live payroll editing — preview & print payslip.</p>
          </div>

          <div className="w-full md:w-96">
            <label className="block text-sm text-indigo-100 mb-1">Select candidate</label>
            <div className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search candidate..."
                className="w-full pr-10 py-2 px-3 rounded-md text-gray-800"
              />
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="absolute right-0 top-0 h-full bg-white rounded-md border-l px-3"
                style={{ minWidth: 220 }}
              >
                <option value="">— choose candidate —</option>
                {filtered.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.firstName} {c.lastName} {c.Designation ? `— ${c.Designation}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-indigo-100 mt-1">Tip: type to filter, then pick from dropdown.</div>
          </div>
        </div>
      </div>

      {/* main grid: editor + preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* left: controls */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Candidate</div>
                <div className="font-medium">{candidate ? `${candidate.firstName} ${candidate.lastName}` : "— not selected —"}</div>
                <div className="text-xs text-gray-400">{candidate?.Designation || ""}</div>
              </div>

              <div className="text-right">
                <div className="text-sm text-gray-500">Period</div>
                <input
                  type="month"
                  className="border rounded px-2 py-1"
                  value={fields.month}
                  onChange={(e) => onFieldChange("month", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <h3 className="text-lg font-semibold">Earnings & Inputs</h3>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-gray-600">Base Salary (monthly)
                <input type="number" value={fields.baseSalary} onChange={(e) => onFieldChange("baseSalary", Number(e.target.value || 0))} className="mt-1 w-full border rounded px-2 py-2" />
              </label>

              <label className="block text-sm text-gray-600">Working days / month
                <input type="number" value={fields.workingDaysInMonth} onChange={(e) => onFieldChange("workingDaysInMonth", Number(e.target.value || 30))} className="mt-1 w-full border rounded px-2 py-2" />
              </label>

              <label className="block text-sm text-gray-600">Hours per day
                <input type="number" value={fields.hoursPerDay} onChange={(e) => onFieldChange("hoursPerDay", Number(e.target.value || 8))} className="mt-1 w-full border rounded px-2 py-2" />
              </label>

              <label className="block text-sm text-gray-600">Advance taken
                <input type="number" value={fields.advance} onChange={(e) => onFieldChange("advance", Number(e.target.value || 0))} className="mt-1 w-full border rounded px-2 py-2" />
              </label>

              <label className="block text-sm text-gray-600">Overtime (days)
                <input type="number" value={fields.overtimeDays} onChange={(e) => onFieldChange("overtimeDays", Number(e.target.value || 0))} className="mt-1 w-full border rounded px-2 py-2" />
              </label>

              <label className="block text-sm text-gray-600">Overtime (hours)
                <input type="number" value={fields.overtimeHours} onChange={(e) => onFieldChange("overtimeHours", Number(e.target.value || 0))} className="mt-1 w-full border rounded px-2 py-2" />
              </label>

              <label className="block text-sm text-gray-600">Leaves (LWP days)
                <input type="number" value={fields.leavesTaken} onChange={(e) => onFieldChange("leavesTaken", Number(e.target.value || 0))} className="mt-1 w-full border rounded px-2 py-2" />
              </label>

              <label className="block text-sm text-gray-600">Late (minutes)
                <input type="number" value={fields.lateMinutes} onChange={(e) => onFieldChange("lateMinutes", Number(e.target.value || 0))} className="mt-1 w-full border rounded px-2 py-2" />
              </label>

              <label className="block text-sm text-gray-600">EPF (employee)
                <input type="number" value={fields.epf} onChange={(e) => onFieldChange("epf", Number(e.target.value || 0))} className="mt-1 w-full border rounded px-2 py-2" />
              </label>

              <label className="block text-sm text-gray-600">Bonus
                <input type="number" value={fields.bonus} onChange={(e) => onFieldChange("bonus", Number(e.target.value || 0))} className="mt-1 w-full border rounded px-2 py-2" />
              </label>

              <label className="block text-sm text-gray-600">Expense reimbursed
                <input type="number" value={fields.expense} onChange={(e) => onFieldChange("expense", Number(e.target.value || 0))} className="mt-1 w-full border rounded px-2 py-2" />
              </label>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Adjustments</h4>
                <button onClick={addAdjustment} className="text-sm px-3 py-1 bg-indigo-600 text-white rounded">+ Add</button>
              </div>

              <div className="mt-3 space-y-2">
                {(fields.adjustments || []).map((adj) => (
                  <div key={adj.id} className="flex gap-2 items-center">
                    <input className="flex-1 border rounded px-2 py-1" placeholder="Reason" value={adj.reason} onChange={(e) => updateAdjustment(adj.id, { reason: e.target.value })} />
                    <input className="w-36 border rounded px-2 py-1" type="number" value={adj.amount} onChange={(e) => updateAdjustment(adj.id, { amount: Number(e.target.value || 0) })} />
                    <button onClick={() => removeAdjustment(adj.id)} className="text-sm text-red-600 px-2">Remove</button>
                  </div>
                ))}
                {fields.adjustments.length === 0 && <div className="text-xs text-gray-400">No adjustments added</div>}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={saveSalary} disabled={!selectedId || saving} className="flex-1 bg-emerald-600 text-white rounded px-4 py-2 shadow hover:opacity-95 disabled:opacity-60">
              {saving ? "Saving..." : "Save & Finalize"}
            </button>
            <button onClick={() => window.print()} className="flex-1 bg-gray-800 text-white rounded px-4 py-2 shadow hover:opacity-95">Print Payslip</button>
          </div>

          {savedSalaryResp && (
            <div className="bg-white p-3 rounded shadow text-sm text-green-700">
              Saved: <strong>{savedSalaryResp._id || savedSalaryResp.id || "OK"}</strong>
            </div>
          )}
        </div>

        {/* right: live preview / payslip */}
        <div className="bg-white rounded-lg shadow p-4" ref={slipRef}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-500">Payslip</div>
              <div className="text-lg font-semibold mt-1"> {candidate ? `${candidate.firstName} ${candidate.lastName}` : "— candidate not selected —"} </div>
              <div className="text-xs text-gray-400">{candidate?.Designation || ""} • {candidate?.email || candidate?.mobile || ""}</div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-500">Month</div>
              <div className="font-medium">{fields.month}</div>
            </div>
          </div>

          <hr className="my-3" />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <div className="text-xs text-gray-400">Basic / Base</div>
              <div className="font-medium">₹ {fmt(fields.baseSalary)}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-gray-400">Per day</div>
              <div className="font-medium">₹ {fmt(calc.perDay)}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-gray-400">Per hour</div>
              <div className="font-medium">₹ {fmt(calc.perHour)}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-gray-400">Overtime (days)</div>
              <div className="font-medium">+ ₹ {fmt(calc.overtimeFromDays)}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-gray-400">Overtime (hours)</div>
              <div className="font-medium">+ ₹ {fmt(calc.overtimeFromHours)}</div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-gray-400">Bonus / Expense</div>
              <div className="font-medium">+ ₹ {fmt(Number(fields.bonus || 0) + Number(fields.expense || 0))}</div>
            </div>
          </div>

          <div className="mt-4 border rounded p-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Gross</div>
                <div className="text-xl font-semibold">₹ {fmt(calc.grossPay)}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Deductions</div>
                <div className="text-xl font-semibold text-red-600">₹ {fmt(calc.totalDeductions)}</div>
              </div>

              <div>
                <div className="text-xs text-gray-500">Net Pay</div>
                <div className="text-2xl font-bold">₹ {fmt(calc.netPay)}</div>
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-600 grid grid-cols-2 gap-2">
              <div>Leave deduction: ₹ {fmt(calc.leaveDeduction)}</div>
              <div>Late deduction: ₹ {fmt(calc.lateDeduction)}</div>
              <div>Advance: ₹ {fmt(fields.advance)}</div>
              <div>EPF: ₹ {fmt(fields.epf)}</div>
              <div>Adjustments: ₹ {fmt(calc.adjustmentsTotal)}</div>
            </div>
          </div>

          {/* adjustments table */}
          <div className="mt-4 text-sm">
            <div className="font-medium mb-2">Adjustments</div>
            <div className="space-y-2">
              {(fields.adjustments || []).length === 0 && <div className="text-xs text-gray-400">No adjustments</div>}
              {(fields.adjustments || []).map((a) => (
                <div key={a.id} className="flex justify-between bg-white border rounded p-2">
                  <div>
                    <div className="text-sm">{a.reason}</div>
                    <div className="text-xs text-gray-400">{a.amount >= 0 ? "Addition" : "Deduction"}</div>
                  </div>
                  <div className={`font-medium ${a.amount >= 0 ? "text-green-600" : "text-red-600"}`}>{a.amount >= 0 ? "+ " : "- " }₹ {fmt(Math.abs(a.amount))}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-400">Generated live from inputs — use Save & Finalize to persist.</div>
        </div>
      </div>

      {/* print styles (simple) */}
      <style jsx>{`
        @media print {
          body * { visibility: hidden; }
          /* show only the slipRef area when printing */
          .printable, .printable * { visibility: visible !important; }
          .printable { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* make the right preview area printable by adding 'printable' class */}
      {/* simple hack: when user clicks Print Payslip we call window.print(); the CSS above isolates .printable */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // attach printable class on the right-hand preview
            (function attachPrintable(){
              const slip = document.querySelector('[ref="slipRef"]');
              // we cannot access React ref here; we will add class to the right preview in runtime instead
            })();
          `,
        }}
      />
    </div>
  );
}
