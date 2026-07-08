import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async (currentToken) => {
    try {
      const response = await api.get("/api/auth/me");
      setUser(response.data.user);
    } catch (error) {
      console.error("Failed to fetch user", error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUser(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    await fetchUser(newToken);
  };

  const register = async (userData) => {
    const response = await api.post("/api/auth/register", userData);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
