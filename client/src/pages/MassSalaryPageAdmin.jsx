import React, { useEffect, useState, useRef } from "react";
import api from "../api/axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function MassSalaryEditorDynamic() {
  const [fieldsTemplate, setFieldsTemplate] = useState({
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
  });

  const [candidates, setCandidates] = useState([]);
  const [salaryTable, setSalaryTable] = useState([]);
  const [hoveredField, setHoveredField] = useState(null);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));

  // single file input ref (useRef) — fixed duplicate-declaration error
  const fileInputRef = useRef(null);

  const LABELS = {
    baseSalary: "Base",
    workingDaysInMonth: "WD/M",
    hoursPerDay: "Hr/D",
    advance: "Adv",
    overtimeDays: "OT-D",
    overtimeHours: "OT-H",
    leavesTaken: "Leaves",
    epf: "EPF",
    bonus: "Bonus",
    expense: "Expense",
    lateMinutes: "Late",
  };

  const FULL_LABELS = {
    baseSalary: "Base Salary",
    workingDaysInMonth: "Working Days in Month",
    hoursPerDay: "Hours per Day",
    advance: "Advance Taken",
    overtimeDays: "Overtime (Days)",
    overtimeHours: "Overtime (Hours)",
    leavesTaken: "Leaves Taken",
    epf: "EPF Deduction",
    bonus: "Bonus",
    expense: "Expense / Reimbursement",
    lateMinutes: "Late Minutes",
  };

  const parseSalaryValue = (val) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === "number") return val || 0;
    const cleaned = String(val).replace(/[^\d.-]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get("/candidates");
        if (!mounted) return;
        setCandidates(data || []);
        const table = (data || []).map((c) => {
          const candSalary = parseSalaryValue(c.Salary);
          const baseRow = { ...fieldsTemplate };
          baseRow.baseSalary = candSalary || fieldsTemplate.baseSalary || 15000;
          const row = {
            candidateId: c._id,
            firstName: c.firstName || "",
            lastName: c.lastName || "",
          };
          for (const k of Object.keys(baseRow)) {
            row[k] = String(baseRow[k] ?? 0);
          }
          return row;
        });
        setSalaryTable(table);
      } catch (err) {
        console.error("Failed to fetch candidates", err);
      }
    })();
    return () => (mounted = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSalaryTable((prev) =>
      prev.map((row) => {
        const updated = { ...row };
        for (const k of Object.keys(fieldsTemplate)) {
          if (updated[k] === undefined) updated[k] = String(fieldsTemplate[k] ?? 0);
        }
        return updated;
      })
    );
  }, [fieldsTemplate]);

  const handleCellChange = (candidateId, field, valueStr) => {
    setSalaryTable((prev) =>
      prev.map((row) => (row.candidateId === candidateId ? { ...row, [field]: valueStr } : row))
    );
  };

  const handleCellFocus = (candidateId, field) => {
    setSalaryTable((prev) =>
      prev.map((row) => {
        if (row.candidateId !== candidateId) return row;
        const copy = { ...row };
        if (copy[field] === "0" || copy[field] === 0) copy[field] = "";
        return copy;
      })
    );
  };

  const handleCellBlur = (candidateId, field) => {
    setSalaryTable((prev) =>
      prev.map((row) => {
        if (row.candidateId !== candidateId) return row;
        const copy = { ...row };
        if (copy[field] === "" || copy[field] === undefined || copy[field] === null) copy[field] = "0";
        return copy;
      })
    );
  };

  const addField = () => {
    const name = window.prompt("Enter new field key (no spaces, e.g. penalty):");
    if (!name) return;
    const key = name.trim();
    if (!key) return alert("Invalid field name");
    if (fieldsTemplate[key] !== undefined) return alert("Field already exists");
    const defStr = window.prompt("Default value (number), use negative for deductions (e.g. -500):", "0");
    const def = Number(defStr === "" ? 0 : defStr);
    setFieldsTemplate((prev) => ({ ...prev, [key]: Number.isFinite(def) ? def : 0 }));
  };

  const removeField = (fieldName) => {
    if (!window.confirm(`Remove field "${fieldName}"? This will remove it from all rows.`)) return;
    setFieldsTemplate((prev) => {
      const copy = { ...prev };
      delete copy[fieldName];
      return copy;
    });
    setSalaryTable((prev) =>
      prev.map((r) => {
        const copy = { ...r };
        delete copy[fieldName];
        return copy;
      })
    );
  };

  const removeEmployee = (candidateId) => {
    if (!window.confirm("Remove this employee from the table?")) return;
    setSalaryTable((prev) => prev.filter((r) => r.candidateId !== candidateId));
  };

  const num = (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const calcRow = (row) => {
    const baseSalary = num(row.baseSalary);
    const workingDaysInMonth = num(row.workingDaysInMonth) || 30;
    const hoursPerDay = num(row.hoursPerDay) || 8;
    const advance = num(row.advance);
    const overtimeDays = num(row.overtimeDays);
    const overtimeHours = num(row.overtimeHours);
    const leavesTaken = num(row.leavesTaken);
    const epf = num(row.epf);
    const bonus = num(row.bonus);
    const expense = num(row.expense);
    const lateMinutes = num(row.lateMinutes);

    const perDay = workingDaysInMonth ? baseSalary / workingDaysInMonth : 0;
    const perHour = hoursPerDay ? perDay / hoursPerDay : 0;

    const overtimeFromDays = overtimeDays * perDay * 1.5;
    const overtimeFromHours = overtimeHours * perHour * 1.5;
    const lateDeduction = (perHour / 60) * lateMinutes;

    const coreKeys = new Set([
      "candidateId", "firstName", "lastName",
      "baseSalary", "workingDaysInMonth", "hoursPerDay",
      "advance", "overtimeDays", "overtimeHours", "leavesTaken",
      "epf", "bonus", "expense", "lateMinutes"
    ]);

    let dynamicAdditions = 0;
    let dynamicNegativeAdjustments = 0;

    for (const k of Object.keys(row)) {
      if (coreKeys.has(k)) continue;
      const v = num(row[k]);
      if (v === 0) continue;
      if (v > 0) dynamicAdditions += v;
      else dynamicNegativeAdjustments += v;
    }

    const additions = bonus + expense + overtimeFromDays + overtimeFromHours + dynamicAdditions;
    const leaveDeduction = leavesTaken * perDay;
    const totalDeductions = advance + epf + leaveDeduction + Math.abs(dynamicNegativeAdjustments) + lateDeduction;

    const grossPay = baseSalary + additions;
    const netPay = grossPay - totalDeductions;

    return { perDay, perHour, overtimeFromDays, overtimeFromHours, lateDeduction, additions, leaveDeduction, totalDeductions, grossPay, netPay };
  };

  const fmt = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const saveAll = async () => {
    if (!window.confirm("Save/Update salary rows for all employees? This will POST each row to /salaries (backend may create or update).")) return;
    try {
      const [yrStr, moStr] = (period || new Date().toISOString().slice(0, 7)).split("-");
      const month = Number(moStr);
      const year = Number(yrStr);
      for (const row of salaryTable) {
        const payloadFields = {};
        for (const k of Object.keys(row)) {
          if (["candidateId", "firstName", "lastName"].includes(k)) continue;
          payloadFields[k] = num(row[k]);
        }
        const payload = {
          candidate: row.candidateId,
          period: { month, year },
          ...payloadFields,
        };
        await api.post("/salaries", payload);
      }
      alert("All salaries posted to server (created/updated).");
    } catch (err) {
      console.error("Error saving all salaries:", err);
      alert("Error saving salaries — check console.");
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const companyName = "Company";
    doc.setFontSize(16);
    doc.text(companyName, 105, 15, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Mass Salary Sheet (${period})`, 105, 25, { align: "center" });

    const columns = ["Employee", ...Object.keys(fieldsTemplate).map((k) => LABELS[k] || k), "Gross Pay", "Deductions", "Net Pay"];
    const data = salaryTable.map((row) => {
      const c = calcRow(row);
      return [
        `${row.firstName} ${row.lastName}`,
        ...Object.keys(fieldsTemplate).map((f) => fmt(num(row[f]))),
        fmt(c.grossPay),
        fmt(c.totalDeductions),
        fmt(c.netPay),
      ];
    });

    autoTable(doc, { head: [columns], body: data, startY: 35, styles: { fontSize: 8 } });
    doc.save(`MassSalary_${period}.pdf`);
  };

  const exportExcel = () => {
    const columns = ["Employee", ...Object.keys(fieldsTemplate).map((k) => LABELS[k] || k), "Gross Pay", "Deductions", "Net Pay"];
    const data = salaryTable.map((row) => {
      const c = calcRow(row);
      return [
        `${row.firstName} ${row.lastName}`,
        ...Object.keys(fieldsTemplate).map((f) => num(row[f])),
        c.grossPay,
        c.totalDeductions,
        c.netPay,
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([columns, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MassSalary");
    XLSX.writeFile(wb, `MassSalary_${period}.xlsx`);
  };

  // --------------- Import Excel logic ---------------
  const headerToKey = (hdr) => {
    if (!hdr) return null;
    const h = String(hdr).trim();
    if (fieldsTemplate[h] !== undefined) return h;
    for (const k of Object.keys(LABELS)) if (LABELS[k].toLowerCase() === h.toLowerCase()) return k;
    for (const k of Object.keys(FULL_LABELS)) if (FULL_LABELS[k].toLowerCase() === h.toLowerCase()) return k;
    const lc = h.toLowerCase();
    if (["employee", "name"].includes(lc)) return "employee";
    if (["email"].includes(lc)) return "email";
    if (["_id", "id", "candidateid", "candidate id"].includes(lc.replace(/\s+/g, ""))) return "candidateId";
    return h;
  };

  const processImportedRows = (rows, headerKeys) => {
    let newFields = { ...fieldsTemplate };
    const updatedTable = [...salaryTable];
    let updatedCount = 0;
    let skippedCount = 0;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;
      const rec = {};
      for (let c = 0; c < headerKeys.length; c++) {
        const key = headerKeys[c];
        if (!key) continue;
        rec[key] = row[c];
      }

      const tryId = rec.candidateId ? String(rec.candidateId).trim() : null;
      const tryEmail = rec.email ? String(rec.email).trim().toLowerCase() : null;
      const tryName = rec.employee ? String(rec.employee).trim().toLowerCase() : null;

      let idx = -1;
      if (tryId) idx = updatedTable.findIndex((t) => String(t.candidateId) === tryId);
      if (idx === -1 && tryEmail) idx = updatedTable.findIndex((t) => (t.email && String(t.email).toLowerCase() === tryEmail));
      if (idx === -1 && tryName) {
        idx = updatedTable.findIndex((t) => {
          const full = `${t.firstName || ""} ${t.lastName || ""}`.trim().toLowerCase();
          return full === tryName;
        });
      }

      if (idx === -1 && (tryEmail || tryName || tryId)) {
        let matchedCandidate = null;
        if (tryId) matchedCandidate = candidates.find((c) => String(c._id) === tryId);
        if (!matchedCandidate && tryEmail) matchedCandidate = candidates.find((c) => (c.email && String(c.email).toLowerCase() === tryEmail));
        if (!matchedCandidate && tryName) matchedCandidate = candidates.find((c) => {
          const full = `${c.firstName || ""} ${c.lastName || ""}`.trim().toLowerCase();
          return full === tryName;
        });
        if (matchedCandidate) {
          idx = updatedTable.findIndex((t) => String(t.candidateId) === String(matchedCandidate._id));
        }
      }

      if (idx === -1) {
        skippedCount++;
        continue;
      }

      const target = { ...updatedTable[idx] };
      for (const key of Object.keys(rec)) {
        if (["employee", "email"].includes(key)) continue;
        if (newFields[key] === undefined && !["candidateId", "firstName", "lastName"].includes(key)) {
          newFields[key] = 0;
          for (let i = 0; i < updatedTable.length; i++) {
            updatedTable[i][key] = String(0);
          }
        }
        if (!["candidateId", "firstName", "lastName"].includes(key)) {
          target[key] = rec[key] !== undefined && rec[key] !== null ? String(rec[key]) : "0";
        }
      }
      updatedTable[idx] = target;
      updatedCount++;
    }

    const newKeys = Object.keys(newFields);
    if (newKeys.length !== Object.keys(fieldsTemplate).length || newKeys.some((k) => fieldsTemplate[k] === undefined)) {
      setFieldsTemplate(newFields);
    }
    setSalaryTable(updatedTable);
    alert(`Import finished. ${updatedCount} rows applied, ${skippedCount} rows skipped (no matching employee).`);
  };

  const handleFileChosen = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (!rows || rows.length === 0) return alert("Empty sheet");
      const rawHeaders = rows[0].map((h) => String(h).trim());
      const headerKeys = rawHeaders.map((h) => headerToKey(h));
      processImportedRows(rows, headerKeys);
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-6 max-w-full overflow-x-auto">
      <h1 className="text-2xl font-bold mb-4">Mass Salary Editor</h1>

      <div className="flex flex-wrap gap-3 items-center mb-4">
        <label className="text-sm mr-2">Period</label>
        <input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <button onClick={saveAll} className="bg-green-600 text-white px-4 py-2 rounded">Save All</button>
        <button onClick={exportPDF} className="bg-gray-800 text-white px-4 py-2 rounded">Export PDF</button>
        <button onClick={exportExcel} className="bg-yellow-600 text-white px-4 py-2 rounded">Export Excel</button>
        <button onClick={addField} className="bg-blue-600 text-white px-3 py-1 rounded">Add Field</button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files && e.target.files[0];
            if (f) handleFileChosen(f);
          }}
        />
        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          className="bg-indigo-600 text-white px-3 py-1 rounded"
        >
          Import Excel
        </button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="table-auto border-collapse border border-gray-300 w-full">
          <thead>
            <tr>
              <th className="border p-2">Employee</th>
              {Object.keys(fieldsTemplate).map((f) => (
                <th
                  key={f}
                  className="border p-2 whitespace-normal break-words"
                  style={{ maxWidth: 140, overflow: "visible", position: "relative" }}
                >
                  <div
                    className="flex items-center gap-2"
                    title={FULL_LABELS[f] || f}
                    aria-label={FULL_LABELS[f] || f}
                    onMouseEnter={() => setHoveredField(f)}
                    onMouseLeave={() => setHoveredField(null)}
                    onFocus={() => setHoveredField(f)}
                    onBlur={() => setHoveredField(null)}
                    tabIndex={0}
                    role="columnheader"
                  >
                    <span>{hoveredField === f ? (FULL_LABELS[f] || f) : (LABELS[f] || f)}</span>
                    <button
                      onClick={() => removeField(f)}
                      className="ml-1 text-red-500 font-bold"
                      title={`Remove field ${f}`}
                      aria-label={`Remove field ${f}`}
                    >
                      x
                    </button>
                  </div>
                </th>
              ))}
              <th className="border p-2">Gross Pay</th>
              <th className="border p-2">Deductions</th>
              <th className="border p-2">Net Pay</th>
              <th className="border p-2">Remove</th>
            </tr>
          </thead>

          <tbody>
            {salaryTable.map((row) => {
              const c = calcRow(row);
              return (
                <tr key={row.candidateId}>
                  <td className="border p-2 whitespace-normal break-words" style={{ maxWidth: 180 }}>
                    {row.firstName} {row.lastName}
                  </td>

                  {Object.keys(fieldsTemplate).map((f) => (
                    <td key={f} className="border p-2" style={{ maxWidth: 140 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={row[f]}
                        onChange={(e) => handleCellChange(row.candidateId, f, e.target.value)}
                        onFocus={() => handleCellFocus(row.candidateId, f)}
                        onBlur={() => handleCellBlur(row.candidateId, f)}
                        className="w-full border p-1"
                        style={{ maxWidth: "100%", boxSizing: "border-box" }}
                      />
                    </td>
                  ))}

                  <td className="border p-2 whitespace-normal break-words">{fmt(c.grossPay)}</td>
                  <td className="border p-2 whitespace-normal break-words">{fmt(c.totalDeductions)}</td>
                  <td className="border p-2 whitespace-normal break-words">{fmt(c.netPay)}</td>
                  <td className="border p-2 text-center">
                    <button onClick={() => removeEmployee(row.candidateId)} className="text-red-600 font-bold">X</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
