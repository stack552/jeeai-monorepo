import React, { useState } from "react";

function ResetPassword({ token, onSuccess }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.detail || "Something went wrong. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.error("Reset password request failed:", err);
      setError("Could not reach the server. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-zinc-100 mb-6">
          Set a new password
        </h2>

        {success ? (
          <div className="text-sm text-zinc-300 space-y-4">
            <p>Your password has been reset successfully.</p>
            <button
              onClick={onSuccess}
              className="w-full bg-blue-600 hover:bg-blue-500 transition-colors rounded-full py-2.5 text-sm font-medium text-white"
            >
              Go to login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="w-full bg-zinc-800 rounded-full px-4 py-2.5 outline-none placeholder:text-zinc-500 text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-zinc-800 rounded-full px-4 py-2.5 outline-none placeholder:text-zinc-500 text-zinc-100"
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 px-1">{error}</div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors rounded-full py-2.5 text-sm font-medium text-white"
            >
              {isSubmitting ? "Resetting..." : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
