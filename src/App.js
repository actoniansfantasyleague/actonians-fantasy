import React, { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import PickTeam from './pages/PickTeam'
import Leaderboard from './pages/Leaderboard'
import './App.css'

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

function NavBar() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">🏏</span>
        <span className="brand-name">Actonians Fantasy</span>
      </div>
      {user && (
        <>
          <div className="navbar-links">
            <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>Dashboard</Link>
            <Link to="/pick" className={`nav-link ${isActive('/pick') ? 'active' : ''}`}>Pick XI</Link>
            <Link to="/leaderboard" className={`nav-link ${isActive('/leaderboard') ? 'active' : ''}`}>Leaderboard</Link>
          </div>
          <div className="navbar-right">
            <span className="nav-manager">{profile?.team_name || 'My Team'}</span>
            <button onClick={handleLogout} className="btn-logout">Sign out</button>
          </div>
        </>
      )}
    </nav>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading...</p></div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, profile, setProfile, loading }}>
      <BrowserRouter>
        <NavBar />
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/pick" element={<ProtectedRoute><PickTeam /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
