import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', displayName: '', teamName: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { display_name: form.displayName } }
    })

    if (error) { setError(error.message); setLoading(false); return }

    if (data.user) {
      // Update profile with team name
      await supabase.from('profiles').update({ team_name: form.teamName, display_name: form.displayName })
        .eq('id', data.user.id)
      navigate('/')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-icon">🏏</span>
          <h1 className="auth-title">Join the League</h1>
          <p className="auth-sub">Create your Actonians Fantasy account</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Your name</label>
            <input type="text" className="form-input" value={form.displayName} onChange={set('displayName')} placeholder="e.g. James Smith" required />
          </div>
          <div className="form-group">
            <label className="form-label">Team name</label>
            <input type="text" className="form-input" value={form.teamName} onChange={set('teamName')} placeholder="e.g. The Golden Ducks" required />
          </div>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input type="email" className="form-input" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={form.password} onChange={set('password')} placeholder="At least 6 characters" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
