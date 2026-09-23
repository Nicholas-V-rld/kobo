import { useMemo, useState } from 'react'
import { buildEntries, EntryList, type Entry } from '../components/EntryList'
import { useStore } from '../lib/store'

const FILTERS: { id: string; label: string; match: (e: Entry) => boolean }[] = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'in', label: 'Income', match: (e) => e.table === 'incomes' || e.table === 'product_returns' },
  { id: 'out', label: 'Spending', match: (e) => e.table === 'expenses' },
  { id: 'convert', label: 'Conversions', match: (e) => e.table === 'conversions' },
  { id: 'move', label: 'Moves', match: (e) => e.table === 'moves' },
]

export function History({ onToast }: { onToast: (s: string) => void }) {
  const { data, remove } = useStore()
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const entries = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!
    const needle = q.trim().toLowerCase()
    return buildEntries(data).filter((e) => f.match(e) && (!needle || `${e.title} ${e.meta}`.toLowerCase().includes(needle)))
  }, [data, filter, q])

  const onDelete = async (e: Entry) => {
    if (!window.confirm(`Delete "${e.title}" (${e.amount})? This can't be undone.`)) return
    if (await remove(e.table, e.id)) onToast('Deleted')
  }

  return (
    <>
      <div className="month-nav"><h1>History</h1></div>
      <input className="input" type="search" placeholder="Search clients, categories, notes" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 'var(--s4)' }} />
      <div className="seg" role="group" aria-label="Filter" style={{ marginLeft: 'calc(var(--s4) * -1)', marginRight: 'calc(var(--s4) * -1)', paddingLeft: 'var(--s4)', paddingRight: 'var(--s4)' }}>
        {FILTERS.map((f) => <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>)}
      </div>
      {entries.length ? <EntryList entries={entries} onDelete={onDelete} /> : <p className="empty">Nothing here yet.</p>}
    </>
  )
}
