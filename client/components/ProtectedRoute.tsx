import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthContext";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && ![requiredRole].flat().includes(user?.role)) {
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;