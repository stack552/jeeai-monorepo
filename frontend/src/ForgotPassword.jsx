import React, { useState } from "react";


function ForgotPassword({ onClose, onSwitchToLogin }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      // The backend always returns the same generic success message,
      // whether or not the email exists — so we just show it as-is
      // rather than branching on res.ok.
      await res.json().catch(() => null);
      setSubmitted(true);
    } catch (err) {
      console.error("Forgot password request failed:", err);
      setError("Could not reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-sm mx-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 z-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-zinc-100">Reset your password</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <div className="text-sm text-zinc-300 space-y-4">
            <p>
              If that email is registered, a reset link has been sent. Check
              your inbox (and spam folder) for a message from JEEAI.
            </p>
            <button
              onClick={onSwitchToLogin}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Back to login
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-zinc-400 mb-4">
              Enter your email and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
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
                {isSubmitting ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-zinc-400">
              Remembered your password?{" "}
              <button
                onClick={onSwitchToLogin}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Log in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
