import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(email, password, name);
      navigate("/");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-card rounded-lg shadow-lg p-8 border border-border">
      <h1 className="mb-6 text-center">Create Account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block mb-2 text-foreground">
            Full Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 bg-input-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>
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
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating Account..." : "Register"}
        </button>
      </form>
      <p className="mt-6 text-center text-muted-foreground">
        Already have an account?{" "}
        <Link to="/" className="text-primary hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}
