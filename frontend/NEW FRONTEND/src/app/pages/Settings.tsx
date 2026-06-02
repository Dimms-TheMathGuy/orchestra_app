import { useNavigate } from "react-router";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Sun, Moon, Github, Fingerprint } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";

export function Settings() {
  const { theme, setTheme } = useTheme();
  const [githubConnected, setGithubConnected] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleThemeToggle = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    toast.success(`Switched to ${newTheme} mode`);
  };

  const handleGithubOAuth = () => {
    if (githubConnected) {
      setGithubConnected(false);
      toast.success("GitHub disconnected");
    } else {
      setGithubConnected(true);
      toast.success("GitHub connected successfully!");
    }
  };

  const handleBiometric = () => {
    navigate("/dashboard/passkey-setup");
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-2xl">
          <h1 className="mb-8 text-foreground">Settings</h1>
          <div className="bg-card rounded-lg shadow-sm border border-border divide-y divide-border">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === "light" ? <Sun size={24} className="text-primary" /> : <Moon size={24} className="text-primary" />}
                  <div>
                    <h3 className="text-card-foreground">Theme</h3>
                    <p className="text-sm text-muted-foreground">
                      Currently using {theme} mode
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleThemeToggle}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    theme === "dark" ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      theme === "dark" ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Github size={24} className="text-card-foreground" />
                  <div>
                    <h3 className="text-card-foreground">GitHub OAuth</h3>
                    <p className="text-sm text-muted-foreground">
                      {githubConnected ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleGithubOAuth}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    githubConnected
                      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50"
                      : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  {githubConnected ? "Disconnect" : "Connect"}
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Fingerprint size={24} className="text-card-foreground" />
                  <div>
                    <h3 className="text-card-foreground">Passkey Authentication</h3>
                    <p className="text-sm text-muted-foreground">
                      Use device passkey for secure login
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleBiometric}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Setup
                </button>
              </div>
            </div>

            <div className="p-6">
              <button
                onClick={handleLogout}
                className="w-full bg-destructive text-destructive-foreground py-3 rounded-lg hover:bg-destructive/90 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
