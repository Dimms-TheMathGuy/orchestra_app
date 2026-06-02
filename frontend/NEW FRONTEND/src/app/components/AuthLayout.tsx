import { Outlet, Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export function AuthLayout() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Outlet />
    </div>
  );
}
