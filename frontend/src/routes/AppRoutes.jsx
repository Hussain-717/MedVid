import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Layout
import Layout from "../components/Layout";

// Public Pages
import Home from "../pages/Home";
import Signup from "../pages/Signup";
import Login from "../pages/Login";

// Protected Pages
import Dashboard from "../pages/Dashboard";
import History from "../pages/History";
import Results from "../pages/Results";
import Consultant from "../pages/Consultant";
import UploadPage from "../pages/VideoUploadPage";
import Profile from "../pages/Profile";
import Settings from "../pages/Settings";
import About from "../pages/About";

// Legal Pages
import PrivacyPolicy from "../pages/PrivacyPolicy";
import TermsOfService from "../pages/TermsOfService";

// Admin Pages
import AdminLogin from "../pages/AdminLogin";
import AdminPanel from "../pages/AdminPanel";

// Consultant Pages
import ConsDashboard from "../pages/ConsDashboard";
import ReviewQueue from "../pages/ReviewQueue";
import AuditLog from "../pages/AuditLog";

// ----------------------------------------------------------------------------------
// AUTH & ROLE HELPERS
// ----------------------------------------------------------------------------------

// PrivateRoute: Checks if any user is logged in
const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem("medvid_token");
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// AdminRoute: Checks specifically for Consultant/Admin privileges
const AdminRoute = ({ children }) => {
  const isAdminAuthenticated = !!localStorage.getItem("medvid_admin_token");
  return isAdminAuthenticated ? children : <Navigate to="/login" />;
};

// RoleBasedHistory: Decides which page to show at "/history"
const RoleBasedHistory = () => {
  const user = JSON.parse(localStorage.getItem("medvid_user") || "{}");
  return user.role === "Consultant" ? <ReviewQueue /> : <History />;
};

// ----------------------------------------------------------------------------------
// APP ROUTES COMPONENT
// ----------------------------------------------------------------------------------

const AppRoutes = () => {
  const isAuthenticated = !!localStorage.getItem("medvid_token");

  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Home />}
      />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />

      {/* ADMIN ROUTES */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
      />

      {/* PROTECTED ROUTES (WITH LAYOUT) */}
      <Route element={<Layout />}>
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/upload"
          element={
            <PrivateRoute>
              <UploadPage />
            </PrivateRoute>
          }
        />

        <Route
          path="/history"
          element={
            <PrivateRoute>
              <RoleBasedHistory />
            </PrivateRoute>
          }
        />

        <Route
          path="/logs"
          element={
            <PrivateRoute>
              <AuditLog />
            </PrivateRoute>
          }
        />

        <Route
          path="/results/:videoId"
          element={
            <PrivateRoute>
              <Results />
            </PrivateRoute>
          }
        />

        <Route
          path="/consultant"
          element={
            <PrivateRoute>
              <Consultant />
            </PrivateRoute>
          }
        />

        <Route
          path="/consDashboard"
          element={
            <AdminRoute>
              <ConsDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Settings />
            </PrivateRoute>
          }
        />

        <Route
          path="/about"
          element={
            <PrivateRoute>
              <About />
            </PrivateRoute>
          }
        />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default AppRoutes;