// src/App.tsx
import { Link, NavLink, BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom'
import SavingsPlanner from './pages/SavingsPlanner'
import Portfolio from './pages/Portfolio'
import { AuthProvider } from './auth/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import RequireAuth from './auth/RequireAuth'
import { useAuth } from './auth/AuthContext'

function Nav() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <header className="bg-white border-b">
      <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link to="/" className="font-semibold">NorthStar</Link>
        <NavLink
          to="/portfolio"
          className={({ isActive }) => `text-sm ${isActive ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Portfolio
        </NavLink>
        <NavLink
          to="/savings"
          className={({ isActive }) => `text-sm ${isActive ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
        >
          Savings
        </NavLink>

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-gray-700">{user.email}</span>
              <button
                onClick={() => { logout(); nav('/login'); }}
                className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="text-sm text-gray-700 hover:text-gray-900">
                Login
              </NavLink>
              <NavLink to="/register" className="text-sm text-blue-600">
                Sign up
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* public */}
          <Route path="/login" element={<Login/>} />
          <Route path="/register" element={<Register/>} />

          {/* protected */}
          <Route element={<RequireAuth />}>
            <Route path="/" element={<SavingsPlanner/>} />
            {/* <Route path="/portfolio" element={<Portfolio/>} /> */}
          </Route>

          {/* 404 fallback optional */}
          {/* <Route path="*" element={<Navigate to="/" replace />} /> */}
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
