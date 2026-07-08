import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext({
  user: null,
  signup: () => {},
  login: () => null,
  logout: () => {},
  updateProfile: () => null,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("currentUser");
      if (raw) {
        const u = JSON.parse(raw);
        setUser(u);
      }
    } catch (e) {}
  }, []);

  const signup = (payload) => {
    // payload: { email, firstName, lastName, bizType }
    const all = JSON.parse(localStorage.getItem("users") || "[]");
    const exists = all.find((u) => u.email === payload.email);
    if (!exists) {
      all.push(payload);
      localStorage.setItem("users", JSON.stringify(all));
    }
    localStorage.setItem("currentUser", JSON.stringify(payload));
    setUser(payload);
  };

  const login = ({ email }) => {
    const all = JSON.parse(localStorage.getItem("users") || "[]");
    const found = all.find((u) => u.email === email);
    if (found) {
      localStorage.setItem("currentUser", JSON.stringify(found));
      setUser(found);
      return found;
    }
    // fallback: treat as buyer if not registered
    const guest = { email, bizType: "buyer", firstName: "", lastName: "" };
    localStorage.setItem("currentUser", JSON.stringify(guest));
    setUser(guest);
    return guest;
  };

  const updateProfile = (updates) => {
    if (!user) return null;
    const nextUser = { ...user, ...updates };
    const all = JSON.parse(localStorage.getItem("users") || "[]");
    const idx = all.findIndex((u) => u.email === nextUser.email);
    if (idx > -1) {
      all[idx] = nextUser;
      localStorage.setItem("users", JSON.stringify(all));
    }
    localStorage.setItem("currentUser", JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    localStorage.removeItem("currentUser");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, signup, login, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
