import { createContext, useContext, useState, ReactNode } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  githubUsername?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email: string, password: string) => {
    const mockUser: User = {
      id: "user-1",
      email,
      name: "John Doe",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
    };
    setUser(mockUser);
    localStorage.setItem("user", JSON.stringify(mockUser));
  };

  const register = async (email: string, password: string, name: string) => {
    const mockUser: User = {
      id: "user-1",
      email,
      name,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    };
    setUser(mockUser);
    localStorage.setItem("user", JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
