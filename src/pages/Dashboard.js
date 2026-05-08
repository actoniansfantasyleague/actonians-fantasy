import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [activeWeek, setActiveWeek] = useState(null)
  const [myTeam, setMyTeam] = useState(null)
  const [myPlayers, setMyPlayers] = useState([])
  const [topManagers, setTopManagers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [user])

  const loadData = async () => {
    // Get active week
    const { data: week } = await supabase.from('weeks').select('*').eq('is_active', true).single()
    setActiveWeek(week)

    if (week && user) {
      // Get my team for this week
      const { data: team } = await supabase.from('user_teams').select('*').eq('user_id', user.id).eq('week_id', week.id).single()
      setMyTeam(team)

      if (team) {
        // Get player details
        const { data: players } = await supabase.from('players').select('*').in('id', team.player_ids)
        setMyPlayers(players || [])
      }
    }

    // Get top 5 managers
    const { data: managers } = await supabase.from('profiles').select('display_name, team_name, total_points').order('total_points', { ascending: false }).limit(5)
    setTopManagers(managers || [])
    setLoading(false)
  }

  const initials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'

  const roleLabel = { bat: 'Batter', bowl: 'Bowler', wk: 'Wicketkeeper', all: 'All-rounder' }

  if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading your dashboard...</p></div>

  return (
    <div>
      <h1 className="page-title">Welcome back{profile?.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''} 👋</h1>
      <p className="page-subtitle">{activeWeek ? `${activeWeek.label} — ${new Date(activeWeek.match_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}` : 'No active gameweek'}</p>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total points</div>
          <div className="stat-value">{profile?.total_points ?? 0}</div>
          <div className="stat-sub">Season total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This week</div>
          <div className="stat-value">{myTeam?.total_points ?? '—'}</div>
          <div className="stat-sub">{activeWeek?.label || 'No active week'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Team status</div>
          <div className="stat-value" style={{ fontSize: '18px', paddingTop: '4px' }}>{myTeam ? '✅ Set' : '⚠️ Not set'}</div>
          <div className="stat-sub">{myTeam ? `${myTeam.player_ids.length} players selected` : 'Pick your XI!'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Your team</div>
          <div className="stat-value" style={{ fontSize: '16px', paddingTop: '4px' }}>{profile?.team_name || '—'}</div>
          <div className="stat-sub">Manager name</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

        {/* My current XI */}
        <div className="card">
          <div className="card-title">My current XI</div>
          {myTeam && myPlayers.length > 0 ? (
            <div style={{ marginTop: '1rem' }}>
              {myPlayers.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div className="player-avatar" style={{ width: 30, height: 30, fontSize: 11, marginBottom: 0 }}>{initials(p.name)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>
                      {p.name}
                      {p.id === myTeam.captain_id && <span className="badge badge-captain" style={{ marginLeft: 6 }}>C</span>}
                      {p.id === myTeam.vice_captain_id && <span className="badge badge-vc" style={{ marginLeft: 6 }}>VC</span>}
                    </div>
                  </div>
                  <span className={`badge badge-${p.role}`}>{roleLabel[p.role]}</span>
                </div>
              ))}
              <Link to="/pick" className="btn btn-secondary" style={{ marginTop: '1rem', justifyContent: 'center', display: 'flex' }}>
                Change team for next week →
              </Link>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📋</div>
              <p style={{ marginBottom: '1rem' }}>You haven't picked a team yet!</p>
              <Link to="/pick" className="btn btn-primary">Pick your XI now</Link>
            </div>
          )}
        </div>

        {/* Mini leaderboard */}
        <div className="card">
          <div className="card-title">Top managers</div>
          <div style={{ marginTop: '1rem' }}>
            {topManagers.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No managers yet — be the first!</p>}
            {topManagers.map((m, i) => (
              <div key={i} className="lb-row">
                <div className={`lb-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>{i + 1}</div>
                <div className="lb-avatar">{initials(m.display_name)}</div>
                <div className="lb-info">
                  <div className="lb-manager">{m.display_name}</div>
                  <div className="lb-team">{m.team_name}</div>
                </div>
                <div>
                  <div className="lb-points">{m.total_points}</div>
                  <div className="lb-pts-label">pts</div>
                </div>
              </div>
            ))}
            <Link to="/leaderboard" className="btn btn-outline" style={{ marginTop: '1rem', justifyContent: 'center', display: 'flex', fontSize: 13 }}>
              Full leaderboard →
            </Link>
          </div>
        </div>
      </div>

      {/* Scoring guide */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <div className="card-title">Scoring guide</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginTop: '1rem' }}>
          {[
            ['Run scored', '+1 pt'],['Fifty (50+)', '+8 pts'],['Century (100+)', '+16 pts'],
            ['Wicket taken', '+25 pts'],['5-wicket haul', '+20 pts bonus'],['Maiden over', '+12 pts'],
            ['Catch', '+8 pts'],['Stumping', '+12 pts'],['Run out', '+8 pts'],
            ['Duck (0)', '-4 pts'],['Appearance', '+4 pts'],['Captain', '2× points'],
          ].map(([action, pts]) => (
            <div key={action} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', background: 'var(--cream)', borderRadius: '6px', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>{action}</span>
              <span style={{ fontWeight: 600, color: pts.includes('-') ? 'var(--red)' : 'var(--green)' }}>{pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
