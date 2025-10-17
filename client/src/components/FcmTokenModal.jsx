import React, { useEffect, useMemo, useState, useContext } from "react";
import Modal from "./Modal";
import api from "../api/axios";
import { AuthContext } from "../context/AuthContext";

export default function FcmTokenModal({ isOpen, onClose }) {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const local = useMemo(() => {
    try {
      const raw = localStorage.getItem("fcm_token");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [isOpen]);

  const userId = user?.id || local?.userId || "";
  const token = local?.token || "";

  useEffect(() => {
    if (!isOpen) return;
    setMessage("");
  }, [isOpen]);

  const handleSave = async () => {
    if (!isAuthenticated || !userId || !token) {
      setMessage("Missing user or token");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      console.log("[FCM] 📨 Manually saving token via modal", { userId, token });
      await api.post("/fcm/token", { userId, token, platform: "web" });
      setMessage("Saved successfully");
    } catch (e) {
      console.error("[FCM] ❌ Manual save failed", e);
      setMessage(e?.response?.data?.message || e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Save FCM Token">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">User ID</label>
          <input
            readOnly
            value={userId}
            className="w-full mt-1 px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-900 dark:border-gray-700 text-gray-800 dark:text-gray-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">FCM Token</label>
          <textarea
            readOnly
            value={token}
            rows={3}
            className="w-full mt-1 px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-900 dark:border-gray-700 text-gray-800 dark:text-gray-200"
          />
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          Route: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">POST /fcm/token</code>
        </div>
        {message && (
          <div className="text-sm text-blue-600 dark:text-blue-400">{message}</div>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">Close</button>
          <button
            onClick={handleSave}
            disabled={saving || !userId || !token}
            className={`px-4 py-2 rounded text-white ${saving ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}


