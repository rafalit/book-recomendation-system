import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPassword from "./pages/ResetPassword";
import HomePage from "./pages/HomePage";
import ContactPage from "./pages/ContactPage";
import EventsPage from "./pages/EventsPage";
import ProtectedRoute from "./components/router/ProtectedRoute";
import { AuthProvider } from "./components/auth/AuthContext";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ZAWSZE przekieruj na /home; autoryzacja w ProtectedRoute */}
          <Route path="/" element={<Navigate to="/home" replace />} />

          {/* Publiczne trasy */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* Chronione trasy */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/events"
            element={
              <ProtectedRoute>
                <EventsPage />
              </ProtectedRoute>
            }
          />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
