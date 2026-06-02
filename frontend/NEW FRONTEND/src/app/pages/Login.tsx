import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (error) {
      toast.error("Invalid credentials. Click 'Forgot Password' to reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-8 border border-border">
      <h1 className="mb-6 text-center">Welcome Back</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block mb-2 text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label htmlFor="password" className="block mb-2 text-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot Password?
          </Link>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
      <p className="mt-6 text-center text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/register" className="text-primary hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
