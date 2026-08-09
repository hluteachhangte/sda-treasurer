import { createContext, useContext, useMemo, useState } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, hasFirebaseConfig } from "../firebase";
import { seedState } from "../data/seedData";

const AuthContext = createContext(null);

const APP_USERS = [
  { id: "treasurer", username: "Treasurer", password: "bethel@01", name: "Treasurer", role: "Treasurer", churchId: "bethel-sda" },
  { id: "elder", username: "Elder", password: "bethel@02", name: "Elder", role: "Pastor or Church Elder", churchId: "bethel-sda" },
  { id: "guest", username: "Guest", password: "guest@123", name: "Guest", role: "Pastor or Church Elder", churchId: "bethel-sda" },
  { id: "admin", username: "admin", password: "admin_#123", name: "Admin", role: "Administrator", churchId: "bethel-sda" }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("bethel-user") || "null"));
  const [authError, setAuthError] = useState("");

  async function login(username, password) {
    setAuthError("");
    const appUser = APP_USERS.find((item) => item.username.toLowerCase() === username.toLowerCase() && item.password === password);
    if (appUser) {
      const session = { uid: appUser.id, username: appUser.username, name: appUser.name, role: appUser.role, churchId: appUser.churchId };
      localStorage.setItem("bethel-user", JSON.stringify(session));
      setUser(session);
      return session;
    }

    const demoUser = seedState.users.find((item) => item.email.toLowerCase() === username.toLowerCase());
    if (!hasFirebaseConfig && demoUser && password === "demo123") {
      const session = { uid: demoUser.id, email: demoUser.email, name: demoUser.name, role: demoUser.role, churchId: demoUser.churchId };
      localStorage.setItem("bethel-user", JSON.stringify(session));
      setUser(session);
      return session;
    }
    if (!hasFirebaseConfig) {
      setAuthError("Invalid username or password.");
      throw new Error("Failed login");
    }
    const credential = await signInWithEmailAndPassword(auth, username, password);
    const session = { uid: credential.user.uid, email: credential.user.email, name: credential.user.displayName || credential.user.email, role: "Treasurer", churchId: "bethel-sda" };
    localStorage.setItem("bethel-user", JSON.stringify(session));
    setUser(session);
    return session;
  }

  async function logout() {
    if (hasFirebaseConfig) await signOut(auth);
    localStorage.removeItem("bethel-user");
    setUser(null);
  }

  const value = useMemo(() => ({ user, login, logout, authError, hasFirebaseConfig }), [user, authError]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
