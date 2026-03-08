import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Upload from '@/pages/Upload'
import Results from '@/pages/Results'
import Library from '@/pages/Library'
import Settings from '@/pages/Settings'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Encyclopedia from '@/pages/Encyclopedia'
import Culinary from '@/pages/Culinary'
import AdminDashboard from '@/pages/AdminDashboard'
import Studies from '@/pages/Studies'
import MarketPrices from '@/pages/MarketPrices'
import Landing from '@/pages/Landing'
import Forum from '@/pages/Forum'
import ChiliMap from '@/pages/ChiliMap'
import Growth from '@/pages/Growth'
import ModelComparison from '@/pages/ModelComparison'
import EmailVerification from '@/pages/EmailVerification'
import { useAuthStore } from '@/stores/authStore'

// Protected route wrapper for admin-only pages
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, canAccessAdminFeatures } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }
  
  if (!canAccessAdminFeatures()) {
    return <Navigate to="/dashboard" />
  }
  
  return <>{children}</>
}

function App() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Routes>
      {/* Public routes — no sidebar/header */}
      <Route path="/landing" element={<Landing />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/verify-email" element={<EmailVerification />} />
      
      {/* App shell — sidebar + header */}
      <Route element={<AppLayout />}>
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/landing" />} 
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/upload" 
          element={isAuthenticated ? <Upload /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/results/:id" 
          element={isAuthenticated ? <Results /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/library" 
          element={isAuthenticated ? <Library /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/encyclopedia" 
          element={<Encyclopedia />} 
        />
        <Route 
          path="/culinary" 
          element={<Culinary />} 
        />
        <Route 
          path="/studies" 
          element={isAuthenticated ? <Studies /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/market" 
          element={<MarketPrices />} 
        />
        <Route 
          path="/chili-map" 
          element={<ChiliMap />} 
        />
        <Route
          path="/forum"
          element={<Forum />}
        />
        <Route
          path="/growth"
          element={<Growth />}
        />
        <Route
          path="/model-comparison"
          element={isAuthenticated ? <ModelComparison /> : <Navigate to="/login" />}
        />
        <Route 
          path="/settings" 
          element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/admin" 
          element={<AdminRoute><AdminDashboard /></AdminRoute>} 
        />
      </Route>
    </Routes>
  )
}

export default App
