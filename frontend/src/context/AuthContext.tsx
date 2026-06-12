import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api";

export type UserRole = "candidate" | "recruiter" | "admin";
export type VerificationStatus = "pending" | "approved" | "rejected" | "none";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  disabilityType?: string;
  udidNumber?: string;
  forcePasswordChange?: boolean;
}

export interface LoginError {
  code: string;
  message: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  disabilityType?: string;
  udidNumber?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

// Map backend role/status formats to frontend formats
const mapRole = (role: string): UserRole => {
  const lower = role.toLowerCase();
  if (lower === "candidate") return "candidate";
  if (lower === "recruiter") return "recruiter";
  if (lower === "admin") return "admin";
  return "candidate";
};

const mapVerification = (status: string): VerificationStatus => {
  const lower = status.toLowerCase();
  if (lower === "verified" || lower === "approved") return "approved";
  if (lower === "rejected") return "rejected";
  if (lower === "pending") return "pending";
  return "none";
};

const mapUser = (data: any): User => ({
  id: data.id || data._id,
  name: data.name,
  email: data.email,
  role: mapRole(data.role),
  verificationStatus: mapVerification(data.verificationStatus || "none"),
  disabilityType: data.disabilityType,
  udidNumber: data.udidNumber,
  forcePasswordChange: data.forcePasswordChange,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("abelup_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("abelup_token"));

  useEffect(() => {
    if (user) localStorage.setItem("abelup_user", JSON.stringify(user));
    else localStorage.removeItem("abelup_user");
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem("abelup_token", token);
    else localStorage.removeItem("abelup_token");
  }, [token]);

  const login = async (email: string, password: string) => {
    // No mock fallback — always hit the real backend
    const data = await api<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(data.token);
    setUser(mapUser(data.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  const register = async (data: RegisterData) => {
    // No mock fallback — always hit the real backend
    const res = await api<{ token: string; user: any }>("/auth/register", {
      method: "POST",
      body: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role.toUpperCase(),
        disabilityType: data.disabilityType,
        udidNumber: data.udidNumber,
      },
    });
    setToken(res.token);
    setUser(mapUser(res.user));
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};
