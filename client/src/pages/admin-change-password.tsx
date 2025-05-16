import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function AdminChangePassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch("/api/admin/me")
      .then(res => {
        if (!res.ok) throw new Error();
      })
      .catch(() => setLocation("/admin/login"));
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    if (res.ok) {
      setSuccess("Password changed successfully.");
      setTimeout(() => setLocation("/admin"), 1500);
    } else {
      const data = await res.json();
      setError(data.message || "Failed to change password");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center">Change Password</h2>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        {success && <div className="mb-4 text-green-600">{success}</div>}
        <div className="mb-4">
          <label className="block mb-1 font-medium">Old Password</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required />
        </div>
        <div className="mb-6">
          <label className="block mb-1 font-medium">New Password</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
        </div>
        <div className="mb-6">
          <label className="block mb-1 font-medium">Confirm Password</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">Change Password</button>
      </form>
    </div>
  );
} 