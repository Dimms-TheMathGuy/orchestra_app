import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      toast.success("Password reset link sent to your email!");
      navigate("/reset-password");
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
      <h1 className="mb-2">Forgot Password</h1>
      <p className="mb-6 text-gray-600">
        Enter your email and we'll send you a reset link
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
      <p className="mt-4 text-center text-gray-600">
        Remember your password?{" "}
        <Link to="/" className="text-blue-600 hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}
