import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { LogOut } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me")
      .then(res => {
        if (!res.ok) throw new Error();
      })
      .catch(() => setLocation("/admin/login"));
  }, [setLocation]);

  const handleLogout = async () => {
    setError("");
    setShowConfirm(false);
    const res = await fetch("/api/admin/logout", { method: "POST" });
    if (res.ok) {
      toast({ title: "Logged out", description: "You have been logged out successfully.", variant: "default" });
      setTimeout(() => setLocation("/admin/login", { replace: true }), 1000);
    } else {
      setError("Failed to log out");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <Toaster />
      <div className="bg-white p-8 rounded shadow-md w-full max-w-xs text-center">
        <h2 className="text-xl font-bold mb-6">Admin Actions</h2>
        <div className="flex flex-col gap-4">
          <button
            className="w-full bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            onClick={() => setLocation("/admin/change-password")}
          >
            Change Password
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            onClick={() => setLocation("/admin/dashboard")}
          >
            Dashboard
          </button>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            onClick={() => setShowConfirm(true)}
          >
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </button>
        </div>
        {error && <div className="mt-4 text-red-600">{error}</div>}
      </div>
      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-xs text-center">
            <h3 className="text-lg font-semibold mb-4">Confirm Logout</h3>
            <p className="mb-6">Are you sure you want to log out?</p>
            <div className="flex justify-center gap-4">
              <button
                className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700"
                onClick={handleLogout}
              >
                Yes, Logout
              </button>
              <button
                className="bg-slate-200 text-slate-800 px-4 py-2 rounded font-semibold hover:bg-slate-300"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 