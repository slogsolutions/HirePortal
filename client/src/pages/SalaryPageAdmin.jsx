import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function SalaryEditorModern() {
  const [candidates, setCandidates] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [candidate, setCandidate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [salaryHistory, setSalaryHistory] = useState([]);
  const [showFormula, setShowFormula] = useState(false);
  const slipRef = useRef();

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
    adjustments: [],
    month: new Date().toISOString().slice(0, 7),
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/candidates");
        if (!mounted) return;
        setCandidates(data || []);
      } catch (err) {
        console.error("Failed to fetch candidates", err);
      }
    })();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setCandidate(null);
      setSalaryHistory([]);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const { data: candidateData } = await api.get(`/candidates/${selectedId}`);
        if (!mounted) return;
        setCandidate(candidateData);

        setFields((f) => ({
          ...f,
          baseSalary: Number(candidateData.Salary || f.baseSalary),
        }));

        const { data: historyData } = await api.get(`/salaries/user/${selectedId}`);
        if (!mounted) return;
        setSalaryHistory(historyData || []);
      } catch (err) {
        console.error("Error fetching candidate or history:", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [selectedId]);

  const calc = useMemo(() => {
    const { baseSalary, workingDaysInMonth, hoursPerDay, advance, overtimeDays, overtimeHours, leavesTaken, epf, bonus, expense, adjustments, lateMinutes } = fields;

    const perDay = workingDaysInMonth ? baseSalary / workingDaysInMonth : 0;
    const perHour = hoursPerDay ? perDay / hoursPerDay : 0;
    const overtimeFromDays = overtimeDays * perDay * 1.5;
    const overtimeFromHours = overtimeHours * perHour * 1.5;
    const lateDeduction = (perHour / 60) * lateMinutes;

    const adjTotal = adjustments.reduce((s, a) => s + Number(a.amount || 0), 0);
    const positiveAdjustments = Math.max(0, adjTotal);
    const negativeAdjustments = Math.min(0, adjTotal);

    const additions = bonus + expense + overtimeFromDays + overtimeFromHours + positiveAdjustments;
    const leaveDeduction = leavesTaken * perDay;
    const totalDeductions = advance + epf + leaveDeduction + Math.abs(negativeAdjustments) + lateDeduction;

    const grossPay = baseSalary + additions;
    const netPay = grossPay - totalDeductions;

    return { perDay, perHour, overtimeFromDays, overtimeFromHours, lateDeduction, additions, leaveDeduction, totalDeductions, grossPay, netPay, adjustmentsTotal: adjTotal };
  }, [fields]);

  function onFieldChange(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  const newAdjId = () => Math.random().toString(36).slice(2, 9);
  const addAdjustment = () => setFields((f) => ({ ...f, adjustments: [...f.adjustments, { id: newAdjId(), reason: "", amount: 0 }] }));
  const updateAdjustment = (id, patch) => setFields((f) => ({ ...f, adjustments: f.adjustments.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  const removeAdjustment = (id) => setFields((f) => ({ ...f, adjustments: f.adjustments.filter((a) => a.id !== id) }));

  async function saveSalary() {
    if (!selectedId) return alert("Choose a candidate first");
    setSaving(true);
    try {
      const payload = { candidate: selectedId, month: fields.month, ...fields };
      const { data } = await api.post("/salaries", payload);
      setSaving(false);
      alert(data.message || "Salary saved!");
      const historyRes = await api.get(`/salaries/user/${selectedId}`);
      setSalaryHistory(historyRes.data || []);
    } catch (err) {
      console.error("Error saving salary:", err);
      setSaving(false);
      alert("Save failed");
    }
  }

  function fmt(v) {
    return Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const handleInputFocus = (e) => {
    if (e.target.value === "0") e.target.value = "";
  };

  const loadHistorySlip = (slip) => {
    setFields({
      baseSalary: slip.baseSalary || 0,
      workingDaysInMonth: slip.workingDaysInMonth || 0,
      hoursPerDay: slip.hoursPerDay || 0,
      advance: slip.advance || 0,
      overtimeDays: slip.overtimeDays || 0,
      overtimeHours: slip.overtimeHours || 0,
      leavesTaken: slip.leavesTaken || 0,
      epf: slip.epf || 0,
      bonus: slip.bonus || 0,
      expense: slip.expense || 0,
      lateMinutes: slip.lateMinutes || 0,
      adjustments:
        slip.adjustments?.map((a) => ({
          id: a._id || Math.random().toString(36).slice(2, 9),
          reason: a.reason || "",
          amount: a.amount || 0,
        })) || [],
      month: `${slip.period?.year || new Date().getFullYear()}-${String(slip.period?.month || new Date().getMonth() + 1).padStart(2, "0")}`,
    });
  };

  const deleteSlip = async (id) => {
    if (!window.confirm("Delete this salary slip?")) return;
    try {
      await api.delete(`/salaries/${id}`);
      setSalaryHistory(salaryHistory.filter((s) => s._id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // ---------------------- PDF Export ----------------------
  const exportPDF = () => {
    const doc = new jsPDF();
    const companyName = "My Company Pvt Ltd";

    doc.setFontSize(16);
    doc.text(companyName, 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Payslip for: ${candidate?.firstName || ""} ${candidate?.lastName || ""}`, 105, 30, { align: "center" });
    doc.text(`Month: ${fields.month}`, 105, 37, { align: "center" });

    const tableData = [
      ["Field", "Amount (₹)"],
      ["Base Salary", fmt(fields.baseSalary)],
      ["Bonus", fmt(fields.bonus)],
      ["Expense", fmt(fields.expense)],
      ["Overtime Days", fmt(fields.overtimeDays)],
      ["Overtime Hours", fmt(fields.overtimeHours)],
      ["Leaves Taken", fmt(fields.leavesTaken)],
      ["Advance", fmt(fields.advance)],
      ["EPF", fmt(fields.epf)],
      ["Late Minutes", fmt(fields.lateMinutes)],
      ...fields.adjustments.map((a) => [a.reason, fmt(a.amount)]),
      ["Gross Pay", fmt(calc.grossPay)],
      ["Total Deductions", fmt(calc.totalDeductions)],
      ["Net Pay", fmt(calc.netPay)],
    ];

    autoTable(doc, {
      startY: 50,
      head: [tableData[0]],
      body: tableData.slice(1),
      styles: { fontSize: 10 },
    });

    doc.save(`Payslip_${candidate?.firstName || ""}_${fields.month}.pdf`);
  };

  // ---------------------- Excel Export ----------------------
  const exportExcel = () => {
    const wsData = [
      ["Field", "Amount (₹)"],
      ["Base Salary", fields.baseSalary],
      ["Bonus", fields.bonus],
      ["Expense", fields.expense],
      ["Overtime Days", fields.overtimeDays],
      ["Overtime Hours", fields.overtimeHours],
      ["Leaves Taken", fields.leavesTaken],
      ["Advance", fields.advance],
      ["EPF", fields.epf],
      ["Late Minutes", fields.lateMinutes],
      ...fields.adjustments.map((a) => [a.reason, a.amount]),
      ["Gross Pay", calc.grossPay],
      ["Total Deductions", calc.totalDeductions],
      ["Net Pay", calc.netPay],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Payslip");
    XLSX.writeFile(wb, `Payslip_${candidate?.firstName || ""}_${fields.month}.xlsx`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gray-800 text-white rounded-lg p-6 shadow-lg mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Payroll Editor</h1>
            <p className="text-gray-300 mt-1">Professional & modern salary slip management</p>
          </div>
          <div className="w-full md:w-96">
            <label className="block text-sm text-gray-300 mb-1">Select candidate</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full py-2 px-3 rounded-md border"
              style={{ color: "#fff", backgroundColor: "#1e3a8a" }}
            >
              <option value="">— choose candidate —</option>
              {candidates.map((c) => (
                <option key={c._id} value={c._id} style={{ color: "#000" }}>
                  {c.firstName} {c.lastName} {c.Designation || c.designation ? `— ${c.Designation || c.designation}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4 col-span-1">
          <div className="bg-white rounded-lg shadow p-4 space-y-3">
            <h3 className="text-lg font-semibold">Earnings & Inputs</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(fields)
                .filter(([k]) => typeof fields[k] === "number")
                .map(([k, v]) => (
                  <label key={k} className="block text-sm text-gray-600">
                    {k}
                    <input
                      type="number"
                      value={v}
                      onChange={(e) => onFieldChange(k, Number(e.target.value || 0))}
                      onFocus={handleInputFocus}
                      className="mt-1 w-full border rounded px-2 py-2"
                    />
                  </label>
                ))}

              {/* Month picker */}
              <label className="block text-sm text-gray-600 col-span-2 mt-2">
                Month
                <input
                  type="month"
                  value={fields.month}
                  onChange={(e) => onFieldChange("month", e.target.value)}
                  className="mt-1 w-full border rounded px-2 py-2"
                />
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={saveSalary}
              disabled={!selectedId || saving}
              className="flex-1 bg-green-600 text-white rounded px-4 py-2 shadow hover:opacity-95 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save & Finalize"}
            </button>
            <button onClick={exportPDF} className="flex-1 bg-gray-800 text-white rounded px-4 py-2 shadow hover:opacity-95">
              Export PDF
            </button>
            <button onClick={exportExcel} className="flex-1 bg-yellow-600 text-white rounded px-4 py-2 shadow hover:opacity-95">
              Export Excel
            </button>
          </div>

          {/* History */}
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="font-semibold mb-2">Salary History</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {salaryHistory.map((s) => (
                <div key={s._id} className="flex justify-between items-center border rounded p-2">
                  <span className="cursor-pointer text-blue-600" onClick={() => loadHistorySlip(s)}>
                    {`${s.period?.year || ""}-${String(s.period?.month || "").padStart(2, "0")}`} — ₹ {fmt(s.netPay)}
                  </span>
                  <button onClick={() => deleteSlip(s._id)} className="text-red-600 text-sm">
                    Delete
                  </button>
                </div>
              ))}
              {salaryHistory.length === 0 && <div className="text-xs text-gray-400">No salary slips yet</div>}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="col-span-2 bg-white rounded-lg shadow p-4" ref={slipRef}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-500">Payslip Preview</div>
              <div className="text-lg font-semibold mt-1">{candidate ? `${candidate.firstName} ${candidate.lastName}` : "— candidate not selected —"}</div>
              <div className="text-xs text-gray-400">{candidate?.Designation || ""}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Month</div>
              <div className="font-medium">{fields.month}</div>
            </div>
          </div>

          <hr className="my-3" />

          {/* Numeric fields */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(fields)
              .filter(([k, v]) => typeof v === "number")
              .map(([k, v]) => (
                <div key={k} className="space-y-1">
                  <div className="text-xs text-gray-400">{k}</div>
                  <div className="font-medium">₹ {fmt(v)}</div>
                </div>
              ))}
            <div className="space-y-1">
              <div className="text-xs text-gray-400">Gross Pay</div>
              <div className="font-medium text-green-600">₹ {fmt(calc.grossPay)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-400">Deductions</div>
              <div className="font-medium text-red-600">₹ {fmt(calc.totalDeductions)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-400">Net Pay</div>
              <div className="font-bold text-xl">₹ {fmt(calc.netPay)}</div>
            </div>
          </div>

          {/* Adjustments */}
          <div className="mt-4 text-sm">
            <div className="font-medium mb-2">Adjustments</div>
            <div className="space-y-2">
              {fields.adjustments.length === 0 && <div className="text-xs text-gray-400">No adjustments</div>}
              {fields.adjustments.map((a) => (
                <div key={a.id} className="flex justify-between bg-gray-50 border rounded p-2">
                  <div>{a.reason}</div>
                  <div className={a.amount >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {a.amount >= 0 ? "+ " : "- "}₹ {fmt(Math.abs(a.amount))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Formula Toggle Button */}
          <div className="mt-6">
            <button
              onClick={() => setShowFormula(!showFormula)}
              className="bg-blue-600 text-white rounded px-4 py-2 text-sm shadow hover:opacity-90"
            >
              {showFormula ? "Hide Formula" : "Show Formula"}
            </button>
          </div>

          {/* Formula Explanation */}
          {showFormula && (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm leading-relaxed text-gray-700">
              <h3 className="text-lg font-semibold mb-2 text-blue-800">Salary Calculation Formula</h3>

              <p className="mb-2">
                <strong>Per Day Salary</strong> = Base Salary ÷ Working Days in Month
              </p>
              <p className="mb-2">
                <strong>Per Hour Salary</strong> = Per Day Salary ÷ Hours Per Day
              </p>

              <h4 className="font-semibold mt-3 mb-1 text-green-700">Earnings (Additions)</h4>
              <ul className="list-disc pl-5 mb-2">
                <li>Bonus</li>
                <li>Expense reimbursements</li>
                <li>Overtime (Days) = OvertimeDays × PerDay × 1.5</li>
                <li>Overtime (Hours) = OvertimeHours × PerHour × 1.5</li>
                <li>Positive Adjustments</li>
              </ul>

              <p className="mb-3">
                <strong>Total Additions</strong> = Bonus + Expense + (OvertimeDays × PerDay × 1.5) + (OvertimeHours × PerHour × 1.5) + PositiveAdjustments
              </p>

              <h4 className="font-semibold mt-3 mb-1 text-red-700">Deductions</h4>
              <ul className="list-disc pl-5 mb-2">
                <li>Advance</li>
                <li>EPF</li>
                <li>Leave Deduction = LeavesTaken × PerDay</li>
                <li>Late Deduction = (PerHour ÷ 60) × LateMinutes</li>
                <li>Negative Adjustments</li>
              </ul>

              <p className="mb-3">
                <strong>Total Deductions</strong> = Advance + EPF + (LeavesTaken × PerDay) + (PerHour ÷ 60 × LateMinutes) + |NegativeAdjustments|
              </p>

              <h4 className="font-semibold mt-3 mb-1 text-gray-800">Final Calculation</h4>
              <p>
                <strong>Gross Pay</strong> = Base Salary + Additions
                <br />
                <strong>Net Pay</strong> = Gross Pay − Deductions
              </p>

              <div className="mt-3 italic text-xs text-gray-500">
                (Overtime is paid at 1.5× rate. Negative adjustments are treated as deductions.)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
