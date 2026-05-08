import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

export default function Leaderboard() {
  const { user } = useAuth()
  const [managers, setManagers] = useState([])
  const [weeks, setWeeks] = useState([])
  const [selectedWeek, setSelectedWeek] = useState('overall')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])
  useEffect(() => { loadWeekData() }, [selectedWeek])

  const loadData = async () => {
    const { data: allWeeks } = await supabase.from('weeks').select('*').order('match_date', { ascending: false })
    setWeeks(allWeeks || [])
    await loadWeekData()
  }

  const loadWeekData = async () => {
    setLoading(true)
    if (selectedWeek === 'overall') {
      const { data } = await supabase.from('profiles').select('id, display_name, team_name, total_points').order('total_points', { ascending: false })
      setManagers(data || [])
    } else {
      const { data } = await supabase
        .from('user_teams')
        .select('user_id, total_points, captain_id, profiles(display_name, team_name)')
        .eq('week_id', selectedWeek)
        .order('total_points', { ascending: false })
      setManagers((data || []).map(t => ({
        id: t.user_id,
        display_name: t.profiles?.display_name,
        team_name: t.profiles?.team_name,
        total_points: t.total_points
      })))
    }
    setLoading(false)
  }

  const initials = (name) => name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'
  const medalColor = [null, 'gold', 'silver', 'bronze']

  return (
    <div>
      <h1 className="page-title">Leaderboard</h1>
      <p className="page-subtitle">Season standings — Actonians CC Fantasy League</p>

      {/* Week selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button className={`filter-pill ${selectedWeek === 'overall' ? 'active' : ''}`} onClick={() => setSelectedWeek('overall')}>
          Overall
        </button>
        {weeks.map(w => (
          <button key={w.id} className={`filter-pill ${selectedWeek === w.id ? 'active' : ''}`} onClick={() => setSelectedWeek(w.id)}>
            {w.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : (
        <div className="card">
          {managers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🏆</div>
              <p>No teams picked yet for this gameweek.</p>
            </div>
          )}

          {/* Top 3 podium */}
          {managers.length >= 3 && selectedWeek === 'overall' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '1.5rem', padding: '1rem', background: 'var(--cream)', borderRadius: 10 }}>
              {[managers[1], managers[0], managers[2]].map((m, podiumIdx) => {
                const rank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3
                const heights = ['80px', '100px', '70px']
                const colors = ['#9ca3af', '#c9952a', '#b45309']
                return (
                  <div key={m?.id} style={{ textAlign: 'center' }}>
                    <div className="lb-avatar" style={{ margin: '0 auto 6px', width: 42, height: 42, fontSize: 14, background: rank === 1 ? 'var(--gold-light)' : 'var(--green-light)', color: rank === 1 ? '#92400e' : 'var(--green)' }}>
                      {initials(m?.display_name)}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{m?.display_name?.split(' ')[0]}</div>
                    <div style={{ height: heights[podiumIdx], background: colors[podiumIdx], borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'white' }}>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700 }}>#{rank}</div>
                      <div style={{ fontSize: 13 }}>{m?.total_points} pts</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Full list */}
          {managers.map((m, i) => (
            <div key={m.id} className="lb-row" style={{ background: m.id === user?.id ? 'var(--green-pale)' : 'transparent' }}>
              <div className={`lb-rank ${medalColor[i + 1] || ''}`}>{i + 1}</div>
              <div className="lb-avatar" style={{ background: m.id === user?.id ? 'var(--green-light)' : undefined }}>
                {initials(m.display_name)}
              </div>
              <div className="lb-info">
                <div className="lb-manager">
                  {m.display_name}
                  {m.id === user?.id && <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--green)', color: 'white', padding: '1px 7px', borderRadius: 99 }}>You</span>}
                </div>
                <div className="lb-team">{m.team_name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="lb-points">{m.total_points}</div>
                <div className="lb-pts-label">pts</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
