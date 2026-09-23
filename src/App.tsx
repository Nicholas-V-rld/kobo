import { BarChart3, History as HistoryIcon, Home as HomeIcon, Plus, Settings as SettingsIcon } from 'lucide-react'
import { Authenticated, AuthLoading, Unauthenticated } from 'convex/react'
import { useCallback, useState } from 'react'
import { AddSheet, type AddKind } from './components/AddSheet'
import { Mark } from './components/Mark'
import { monthLabel, monthKey, today } from './lib/money'
import { StoreProvider, useStore } from './lib/store'
import { Auth } from './screens/Auth'
import { History } from './screens/History'
import { Home } from './screens/Home'
import { Report } from './screens/Report'
import { Settings } from './screens/Settings'

type Tab = 'home' | 'history' | 'report' | 'settings'

export default function App() {
  return (
    <>
      <div className="grain" aria-hidden="true" />
      <AuthLoading>{null}</AuthLoading>
      <Unauthenticated><Auth /></Unauthenticated>
      <Authenticated><StoreProvider><Shell /></StoreProvider></Authenticated>
    </>
  )
}

function Shell() {
  const { error, clearError } = useStore()
  const [tab, setTab] = useState<Tab>('home')
  const [adding, setAdding] = useState<AddKind | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  const go = (t: Tab) => {
    setTab(t)
    window.scrollTo({ top: 0 })
  }

  const TABS: { id: Tab; label: string; Icon: typeof HomeIcon }[] = [
    { id: 'home', label: 'Home', Icon: HomeIcon },
    { id: 'history', label: 'History', Icon: HistoryIcon },
    { id: 'report', label: 'Report', Icon: BarChart3 },
    { id: 'settings', label: 'Settings', Icon: SettingsIcon },
  ]

  return (
    <>
      <main className="app">
        {tab === 'home' && (
          <header className="top">
            <span className="brand"><Mark />Kobo</span>
            <span className="month-tag">{monthLabel(monthKey(today()))}</span>
          </header>
        )}
        {error && (
          <div className="banner" role="status">
            <span>{error}</span>
            <button className="link-btn" onClick={clearError}>Dismiss</button>
          </div>
        )}
        {tab === 'home' && <Home onAdd={setAdding} onSeeAll={() => go('history')} />}
        {tab === 'history' && <History onToast={showToast} />}
        {tab === 'report' && <Report />}
        {tab === 'settings' && <Settings onToast={showToast} />}
      </main>

      <nav className="tabbar" aria-label="Main">
        <div className="tabbar-inner">
          {TABS.slice(0, 2).map(({ id, label, Icon }) => (
            <button key={id} className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}><Icon />{label}</button>
          ))}
          <button className="tab-add" aria-label="Add entry" onClick={() => setAdding('spend')}><Plus /></button>
          {TABS.slice(2).map(({ id, label, Icon }) => (
            <button key={id} className="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}><Icon />{label}</button>
          ))}
        </div>
      </nav>

      {adding && (
        <AddSheet
          initial={adding}
          onClose={() => setAdding(null)}
          onSaved={(msg) => { setAdding(null); showToast(msg) }}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  )
}
