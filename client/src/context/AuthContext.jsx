import { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  /**
   * Whether this person owns the shop or works in it, and what he may do.
   *
   * Defaults to owner. Every account was an owner before staff existed, and a
   * default of "employee with no permissions" would blank the dashboard for
   * everybody the moment the server was older than the client.
   */
  const [staff, setStaff] = useState({
    isOwner: true,
    permissions: [],
    worksFor: null,
  });
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await api.get("/api/auth/me");
      setUser(response.data.user);
      if (response.data.staff) setStaff(response.data.staff);
    } catch (error) {
      console.error("Failed to fetch user", error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    await fetchUser();
  };

  const register = async (userData) => {
    const response = await api.post("/api/auth/register", userData);
    // The server now returns a token on registration so we can auto-login.
    if (response.data.token) {
      await login(response.data.token);
    }
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setStaff({ isOwner: true, permissions: [], worksFor: null });
  };

  const upgradeAccount = async (sellerData) => {
    await api.post("/api/auth/upgrade", sellerData);
    await fetchUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        upgradeAccount,
        staff,
        isOwner: staff.isOwner,
        /**
         * Whether this person may do one thing.
         *
         * An owner always may, so the server does not have to send him the
         * whole catalogue and a new permission does not have to be added in
         * two places to reach him.
         *
         * This hides buttons, it does not guard anything. Every route that
         * matters checks again on the server, which is the boundary.
         */
        can: (permission) =>
          staff.isOwner || staff.permissions.includes(permission),
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export { AuthContext };
