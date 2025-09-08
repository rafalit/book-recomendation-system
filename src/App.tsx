import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPassword from "./pages/ResetPassword";
import HomePage from "./pages/HomePage";
import ContactPage from "./pages/ContactPage";  
import ProtectedRoute from "./components/router/ProtectedRoute";
import { AuthProvider } from "./components/auth/AuthContext";

function App() {
  const hasToken = !!localStorage.getItem("token");

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* domyślnie przekieruj w zależności od posiadania tokena */}
          <Route path="/" element={<Navigate to={hasToken ? "/home" : "/login"} replace />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* /home tylko po zalogowaniu */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
