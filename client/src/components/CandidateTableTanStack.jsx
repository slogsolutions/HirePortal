import React, { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/axios"; // your axios instance
import Modal from "../components/Modal";

const fmtDate = (iso) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const StatusBadge = ({ status }) => {
  const s = (status || "").toLowerCase();
  const map = {
    applied: "bg-yellow-100 text-yellow-800",
    shortlisted: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-800",
    hired: "bg-green-100 text-green-800",
  };
  const cls = map[s] || "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200";
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${cls}`}>
      <span className="w-2 h-2 rounded-full" />
      {status || "-"}
    </span>
  );
};

export default function CandidateTableTanStack({ initialPageSize = 10 }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state for modal
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing] = useState(null); // when non-null, modal shows details
  const [editing, setEditing] = useState(null); // when non-null, modal shows form
  const [saving, setSaving] = useState(false);

  // table state
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: initialPageSize });

  // fetch data
  const fetchCandidates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/candidates");
      setCandidates(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to fetch candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // save (create/update)
  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (payload._id || payload.id) {
        const id = payload._id || payload.id;
        const res = await api.put(`/candidates/${id}`, payload);
        const updated = res.data;
        setCandidates((cur) => cur.map((c) => ((c._id || c.id) === (updated._id || updated.id) ? updated : c)));
      } else {
        const res = await api.post("/candidates", payload);
        setCandidates((cur) => [res.data, ...cur]);
      }
      // close modal & reset states
      setModalOpen(false);
      setEditing(null);
      setViewing(null);
    } catch (err) {
      alert(err.response?.data?.message || "Save failed");
      await fetchCandidates();
    } finally {
      setSaving(false);
    }
  };

  // columns - only the requested columns in table view
  const columns = useMemo(
    () => [
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => `${row.firstName || ""}${row.lastName ? " " + row.lastName : ""}`,
        cell: (info) => <div className="font-medium">{info.getValue()}</div>,
        enableSorting: true,
        enableGlobalFilter: true,
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: (info) => <div className="text-sm truncate max-w-[220px]">{info.getValue() || "-"}</div>,
        enableSorting: true,
      },
      {
        accessorKey: "fatherName",
        header: "Father",
        cell: (info) => <div className="text-sm">{info.getValue() || "-"}</div>,
      },
      {
        accessorKey: "mobile",
        header: "Mobile",
        cell: (info) => <div className="text-sm">{info.getValue() || "-"}</div>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: (info) => <StatusBadge status={info.getValue()} />,
        enableSorting: true,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setViewing(r);
                  setEditing(null);
                  setModalOpen(true);
                }}
                className="px-3 py-1 bg-indigo-600 text-white rounded-md shadow hover:scale-105 transform transition"
              >
                View
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: candidates,
    columns,
    state: {
      globalFilter,
      sorting,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: false,
  });

  /********** CandidateForm (inline) **********/
  const CandidateForm = ({ initial = {}, onSubmit, onCancel }) => {
    const [firstName, setFirstName] = useState(initial.firstName || "");
    const [lastName, setLastName] = useState(initial.lastName || "");
    const [email, setEmail] = useState(initial.email || "");
    const [mobile, setMobile] = useState(initial.mobile || "");
    const [dob, setDob] = useState(initial.dob ? initial.dob.substring(0, 10) : "");
    const [fatherName, setFatherName] = useState(initial.fatherName || "");
    const [status, setStatus] = useState(initial.status || "");

    useEffect(() => {
      setFirstName(initial.firstName || "");
      setLastName(initial.lastName || "");
      setEmail(initial.email || "");
      setMobile(initial.mobile || "");
      setDob(initial.dob ? initial.dob.substring(0, 10) : "");
      setFatherName(initial.fatherName || "");
      setStatus(initial.status || "");
    }, [initial]);

    const submit = (e) => {
      e.preventDefault();
      if (!firstName.trim() || !email.trim()) {
        alert("First name and email required");
        return;
      }
      const payload = {
        ...initial,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        dob: dob ? new Date(dob).toISOString() : null,
        fatherName: fatherName.trim(),
        status: status.trim(),
      };
      onSubmit(payload);
    };

    return (
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm block">First name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1 block w-full rounded border px-2 py-1" />
          </div>
          <div>
            <label className="text-sm block">Last name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1 block w-full rounded border px-2 py-1" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm block">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="mt-1 block w-full rounded border px-2 py-1" />
          </div>
          <div>
            <label className="text-sm block">Mobile</label>
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} className="mt-1 block w-full rounded border px-2 py-1" />
          </div>
          <div>
            <label className="text-sm block">DOB</label>
            <input value={dob} onChange={(e) => setDob(e.target.value)} type="date" className="mt-1 block w-full rounded border px-2 py-1" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm block">Father name</label>
            <input value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="mt-1 block w-full rounded border px-2 py-1" />
          </div>
          <div>
            <label className="text-sm block">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 block w-full rounded border px-2 py-1">
              <option value="">Select</option>
              <option value="applied">Applied</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="rejected">Rejected</option>
              <option value="hired">Hired</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-1 border rounded">Cancel</button>
          <button type="submit" disabled={saving} className="px-3 py-1 bg-blue-600 text-white rounded">{saving ? "Saving..." : "Save"}</button>
        </div>
      </form>
    );
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                table.setGlobalFilter(e.target.value);
                setPagination((p) => ({ ...p, pageIndex: 0 }));
              }}
              placeholder="Search name, email, mobile or father..."
              className="pl-10 pr-4 py-2 rounded-lg border shadow-sm w-80 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <svg className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
              <circle cx="11" cy="11" r="6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <select
            value={pagination.pageSize}
            onChange={(e) => {
              const size = Number(e.target.value);
              setPagination((p) => ({ ...p, pageSize: size, pageIndex: 0 }));
              table.setPageSize(size);
            }}
            className="px-3 py-2 border rounded-lg"
          >
            {[5, 10, 20, 50].map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={fetchCandidates} className="px-4 py-2 border rounded-lg shadow-sm">Refresh</button>
          <button
            onClick={() => {
              setEditing({}); // show the blank form
              setViewing(null);
              setModalOpen(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:brightness-105"
          >
            + Add
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow divide-y overflow-hidden">
        {/* header row */}
        <div className="hidden md:grid grid-cols-6 gap-4 p-4 text-sm font-semibold text-slate-500 dark:text-slate-400">
          {table.getHeaderGroups()[0].headers.map((header) => (
            <div
              key={header.id}
              className={`col-span-${header.column.columnDef.id === "name" ? 2 : header.column.columnDef.id === "email" ? 2 : 1}`}
              onClick={() => {
                if (header.column.getCanSort()) header.column.toggleSorting();
              }}
            >
              <div className="flex items-center gap-2">
                {flexRender(header.column.columnDef.header, header.getContext())}
                {{ asc: "▲", desc: "▼" }[header.column.getIsSorted()] ?? null}
              </div>
            </div>
          ))}
        </div>

        {/* rows */}
        <div>
          {loading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : table.getRowModel().rows.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No records</div>
          ) : (
            <div className="flex flex-col">
              <AnimatePresence initial={false}>
                {table.getRowModel().rows.map((row) => {
                  const c = row.original;
                  const id = c._id || c.id;
                  return (
                    <motion.div
                      layout
                      key={id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      whileHover={{ scale: 1.01 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                      className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center p-4 hover:bg-gray-50 dark:hover:bg-slate-800"
                    >
                      <div className="md:col-span-2">
                        <div className="font-medium">{(c.firstName || "") + (c.lastName ? " " + c.lastName : "")}</div>
                        <div className="text-xs text-gray-400 md:hidden">{fmtDate(c.createdAt)}</div>
                      </div>

                      <div className="md:col-span-2">
                        <div className="text-sm truncate">{c.email}</div>
                        <div className="text-xs text-gray-400 md:hidden">{c.mobile}</div>
                      </div>

                      <div className="md:col-span-1 text-sm">{c.fatherName || "-"}</div>

                      <div className="md:col-span-1 flex items-center justify-between">
                        <div className="hidden md:block">
                          <div className="text-sm">{c.mobile || "-"}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="hidden md:block">
                            <StatusBadge status={c.status} />
                          </div>
                          <div className="md:hidden">
                            <StatusBadge status={c.status} />
                          </div>
                          <div className="ml-2">
                            <button
                              onClick={() => {
                                setViewing(c);
                                setEditing(null);
                                setModalOpen(true);
                              }}
                              className="px-3 py-1 bg-indigo-600 text-white rounded-md shadow hover:scale-105 transform transition"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* pagination controls */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="text-slate-500 dark:text-slate-400">Showing {table.getRowModel().rows.length} of {candidates.length} entries</div>
        <div className="flex items-center gap-2">
          <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} className="px-2 py-1 border rounded">First</button>
          <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="px-2 py-1 border rounded">Prev</button>
          <div>Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}</div>
          <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="px-2 py-1 border rounded">Next</button>
          <button onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} className="px-2 py-1 border rounded">Last</button>
        </div>
      </div>

      {/* modal - view (full details) and add/edit when editing is non-null */}
      <AnimatePresence>
        {modalOpen && (
          <Modal
            isOpen={modalOpen}
            onClose={() => {
              if (!saving) {
                setModalOpen(false);
                setEditing(null);
                setViewing(null);
              }
            }}
            title={viewing ? "Candidate Details" : editing ? (editing._id || editing.id ? "Edit Candidate" : "Add Candidate") : "Candidate"}
          >
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {viewing ? (
                <div className="space-y-3 text-sm">
                  <div><strong>Name:</strong> {(viewing.firstName || "") + (viewing.lastName ? " " + viewing.lastName : "")}</div>
                  <div><strong>Email:</strong> {viewing.email || "-"}</div>
                  <div><strong>Mobile:</strong> {viewing.mobile || "-"}</div>
                  <div><strong>DOB:</strong> {viewing.dob ? fmtDate(viewing.dob) : "-"}</div>
                  <div><strong>Father:</strong> {viewing.fatherName || "-"}</div>
                  <div><strong>Status:</strong> <StatusBadge status={viewing.status} /></div>
                  <div><strong>Address:</strong> {viewing.address || "-"}</div>
                  <div><strong>Resume:</strong> {viewing.resumeUrl ? <a href={viewing.resumeUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">Open</a> : "-"}</div>
                  <div><strong>Notes:</strong> {viewing.notes || "-"}</div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditing(viewing);
                        setViewing(null);
                      }}
                      className="px-3 py-1 border rounded"
                    >
                      Edit
                    </button>
                    <button onClick={() => { setModalOpen(false); setViewing(null); }} className="px-3 py-1 bg-gray-200 rounded">Close</button>
                  </div>
                </div>
              ) : editing ? (
                <CandidateForm
                  initial={editing}
                  onSubmit={handleSave}
                  onCancel={() => {
                    setEditing(null);
                    setModalOpen(false);
                    setViewing(null);
                  }}
                />
              ) : (
                // fallback (shouldn't usually happen)
                <div className="text-sm text-gray-500">Nothing to show</div>
              )}
            </motion.div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
