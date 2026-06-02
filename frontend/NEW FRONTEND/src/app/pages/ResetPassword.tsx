import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match!");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      toast.success("Password reset successfully!");
      navigate("/");
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
      <h1 className="mb-2">Reset Password</h1>
      <p className="mb-6 text-gray-600">Enter your new password</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block mb-2">
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block mb-2">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </div>
  );
}
