import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const BUDGET = 10

export default function PickTeam() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
  const [activeWeek, setActiveWeek] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [captain, setCaptain] = useState(null)
  const [viceCaptain, setViceCaptain] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [captainMode, setCaptainMode] = useState(null)

  useEffect(() => { loadData() }, [user])

  const loadData = async () => {
    const { data: week } = await supabase.from('weeks').select('*').eq('is_active', true).single()
    setActiveWeek(week)
    const { data: allPlayers } = await supabase.from('players').select('*').order('price', { ascending: false })
    setPlayers(allPlayers || [])
    if (week && user) {
      const { data: team } = await supabase.from('user_teams').select('*').eq('user_id', user.id).eq('week_id', week.id).single()
      if (team) {
        setSelected(new Set(team.player_ids))
        setCaptain(team.captain_id)
        setViceCaptain(team.vice_captain_id)
      }
    }
    setLoading(false)
  }

  const spent = [...selected].reduce((s, id) => {
    const p = players.find(x => x.id === id)
    return s + (p?.price || 0)
  }, 0)

  const budgetLeft = parseFloat((BUDGET - spent).toFixed(1))

  const togglePlayer = (player) => {
    if (captainMode) {
      if (!selected.has(player.id)) return
      if (captainMode === 'captain') {
        if (viceCaptain === player.id) setViceCaptain(null)
        setCaptain(captain === player.id ? null : player.id)
      } else {
        if (captain === player.id) setCaptain(null)
        setViceCaptain(viceCaptain === player.id ? null : player.id)
      }
      setCaptainMode(null)
      return
    }
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(player.id)) {
        next.delete(player.id)
        if (captain === player.id) setCaptain(null)
        if (viceCaptain === player.id) setViceCaptain(null)
      } else {
        if (next.size >= 11) { setError('You can only pick 11 players!'); return prev }
        if (budgetLeft < player.price) { setError(`Not enough budget!`); return prev }
        next.add(player.id)
      }
      setError('')
      return next
    })
  }

  const handleSave = async () => {
    if (selected.size !== 11) { setError('Please select exactly 11 players'); return }
    if (!captain) { setError('Please set a captain'); return }
    if (!viceCaptain) { setError('Please set a vice-captain'); return }
    if (!activeWeek) { setError('No active gameweek found'); return }
    setSaving(true)
    setError('')
    const { error: saveError } = await supabase.from('user_teams').upsert({
      user_id: user.id,
      week_id: activeWeek.id,
      player_ids: [...selected],
      captain_id: captain,
      vice_captain_id: viceCaptain,
      total_points: 0
    }, { onConflict: 'user_id,week_id' })
    if (saveError) { setError(saveError.message); setSaving(false) }
    else { setSuccess(true); setSaving(false); setTimeout(() => navigate('/'), 1500) }
  }

  const initials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading players...</p></div>

  if (!activeWeek) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🏏</div>
      <h2 style={{ color: 'var(--navy)', marginBottom: 8 }}>No active gameweek</h2>
      <p>Check back soon!</p>
    </div>
  )

  return (
    <div>
      <h1 className="page-title">Pick your XI</h1>
      <p className="page-subtitle">{activeWeek.label} — Deadline: {new Date(activeWeek.match_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

      {success && <div className="alert alert-success">✅ Team saved! Redirecting...</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="selection-bar">
        <div className="sel-item">
          <span className="sel-label">Budget left</span>
          <span className={`sel-val ${budgetLeft < 0 ? 'over' : ''}`}>£{budgetLeft.toFixed(1)}m</span>
        </div>
        <div className="sel-item">
          <span className="sel-label">Selected</span>
          <span className="sel-val">{selected.size} / 11</span>
        </div>
        <div className="sel-item">
          <span className="sel-label">Captain</span>
          <span className="sel-val" style={{ fontSize: 14, paddingTop: 3 }}>
            {captain ? players.find(p => p.id === captain)?.name.split(' ')[0] || '—' : '— none —'}
          </span>
        </div>
        <div className="sel-item">
          <span className="sel-label">Vice-captain</span>
          <span className="sel-val" style={{ fontSize: 14, paddingTop: 3 }}>
            {viceCaptain ? players.find(p => p.id === viceCaptain)?.name.split(' ')[0] || '—' : '— none —'}
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={() => setCaptainMode(captainMode === 'captain' ? null : 'captain')} className="btn btn-gold" style={{ fontSize: 13, padding: '8px 14px' }}>
            {captainMode === 'captain' ? '↑ Pick C' : 'Set Captain'}
          </button>
          <button onClick={() => setCaptainMode(captainMode === 'vc' ? null : 'vc')} className="btn btn-outline" style={{ fontSize: 13, padding: '8px 14px', background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}>
            {captainMode === 'vc' ? '↑ Pick VC' : 'Set VC'}
          </button>
          <button onClick={handleSave} className="btn btn-primary" style={{ background: '#2d9b5e' }} disabled={saving || selected.size !== 11}>
            {saving ? 'Saving...' : 'Save team'}
          </button>
        </div>
      </div>

      {captainMode && (
        <div className="captain-hint">
          {captainMode === 'captain' ? '⭐ Click a selected player to make them Captain (2× points)' : '🎖 Click a selected player to make them Vice-Captain (1.5× points)'}
        </div>
      )}

      <div className="player-grid">
        {players.map(player => {
          const isSel = selected.has(player.id)
          const isCap = captain === player.id
          const isVC = viceCaptain === player.id
          const cantAfford = !isSel && budgetLeft < player.price
          const full = !isSel && selected.size >= 11
          return (
            <div
              key={player.id}
              className={`player-card ${isCap ? 'captain' : isSel ? 'selected' : ''} ${cantAfford || full ? 'disabled' : ''}`}
              onClick={() => togglePlayer(player)}
            >
              {isSel && !isCap && !isVC && <div className="selected-badge">✓</div>}
              {isCap && <div className="selected-badge" style={{ background: 'var(--gold)' }}>C</div>}
              {isVC && <div className="selected-badge" style={{ background: 'var(--navy)' }}>V</div>}
              <div className="player-avatar">{initials(player.name)}</div>
              <div className="player-name">{player.name}</div>
              <div className="player-price" style={{ marginTop: 8 }}>£{player.price}m</div>
              <div className="player-pts">{player.total_points} pts this season</div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--cream)', borderRadius: 8, fontSize: 13, color: 'var(--text-muted)' }}>
        <strong>How to pick:</strong> Click players to select. Pick exactly 11 within the £{BUDGET}m budget. Double-click "Set Captain" then a player for 2× points. "Set VC" for 1.5× points.
      </div>
    </div>
  )
}
