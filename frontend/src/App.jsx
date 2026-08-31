// ============================================================================
// Main Application Component — React Router & Auth Provider Setup (All 10 Goals)
// ============================================================================
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import AlertsPanel from './pages/AlertsPanel';
import MenuManager from './components/MenuManager';

// Wrap any page in layout + protection
const LayoutPage = ({ children }) => (
  <ProtectedRoute>
    <Layout>{children}</Layout>
  </ProtectedRoute>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Protected + Layout */}
          <Route path="/dashboard" element={<LayoutPage><DashboardPage /></LayoutPage>} />
          <Route path="/orders" element={<LayoutPage><OrdersPage /></LayoutPage>} />
          <Route path="/orders/:id" element={<LayoutPage><OrderDetailPage /></LayoutPage>} />
          <Route path="/alerts" element={<LayoutPage><AlertsPanel /></LayoutPage>} />
          <Route path="/menu" element={<LayoutPage><MenuManager /></LayoutPage>} />

          {/* Redirects */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
