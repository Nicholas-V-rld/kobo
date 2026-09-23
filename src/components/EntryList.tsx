import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Repeat, RotateCcw, Trash2 } from 'lucide-react'
import { ngn, prettyDate, usd } from '../lib/money'
import type { Table } from '../lib/store'
import { BUCKET_LABEL, SOURCE_LABEL, type Data } from '../lib/types'

export type Entry = {
  id: string
  table: Table
  date: string
  created_at: string
  icon: 'in' | 'out' | 'convert' | 'return' | 'move'
  title: string
  meta: string
  amount: string
  sub?: string
  incoming: boolean
}

export function buildEntries(d: Data): Entry[] {
  const out: Entry[] = []
  for (const i of d.incomes) {
    const fee = i.gross - i.net
    const fmt = i.currency === 'USD' ? usd : ngn
    out.push({
      id: i.id, table: 'incomes', date: i.date, created_at: i.created_at, icon: 'in', incoming: true,
      title: i.client || SOURCE_LABEL[i.source],
      meta: [SOURCE_LABEL[i.source], i.note].filter(Boolean).join(' · '),
      amount: `+${fmt(i.net)}`,
      sub: fee > 0 ? `${fmt(fee)} fees` : undefined,
    })
  }
  for (const c of d.conversions) {
    out.push({
      id: c.id, table: 'conversions', date: c.date, created_at: c.created_at, icon: 'convert', incoming: false,
      title: `Converted ${usd(c.usd)}`,
      meta: [`${ngn(c.ngn / c.usd)}/$`, c.note].filter(Boolean).join(' · '),
      amount: ngn(c.ngn),
      sub: c.fee_ngn > 0 ? `${ngn(c.fee_ngn)} charges` : undefined,
    })
  }
  for (const e of d.expenses) {
    out.push({
      id: e.id, table: 'expenses', date: e.date, created_at: e.created_at, icon: 'out', incoming: false,
      title: e.category,
      meta: [BUCKET_LABEL[e.bucket], e.note].filter(Boolean).join(' · '),
      amount: `−${ngn(e.amount_ngn)}`,
    })
  }
  for (const r of d.returns) {
    out.push({
      id: r.id, table: 'product_returns', date: r.date, created_at: r.created_at, icon: 'return', incoming: true,
      title: 'Product return',
      meta: r.note || 'Into Product bucket',
      amount: `+${ngn(r.amount_ngn)}`,
    })
  }
  for (const m of d.moves) {
    out.push({
      id: m.id, table: 'moves', date: m.date, created_at: m.created_at, icon: 'move', incoming: false,
      title: `${BUCKET_LABEL[m.from_bucket]} to ${BUCKET_LABEL[m.to_bucket]}`,
      meta: m.note || 'Moved between buckets',
      amount: ngn(m.amount_ngn),
    })
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))
}

const ICONS = { in: ArrowDownLeft, out: ArrowUpRight, convert: Repeat, return: RotateCcw, move: ArrowLeftRight }

export function EntryList({ entries, onDelete }: { entries: Entry[]; onDelete?: (e: Entry) => void }) {
  const groups: { date: string; items: Entry[] }[] = []
  for (const e of entries) {
    const g = groups[groups.length - 1]
    if (g && g.date === e.date) g.items.push(e)
    else groups.push({ date: e.date, items: [e] })
  }
  return (
    <ul className="entries">
      {groups.map((g) => (
        <li key={g.date}>
          <div className="day">{prettyDate(g.date)}</div>
          <ul className="entries">
            {g.items.map((e) => {
              const Icon = ICONS[e.icon]
              return (
                <li key={e.id} className={`entry${onDelete ? ' with-del' : ''}`}>
                  <span className={`entry-icon${e.incoming ? ' in' : ''}`}><Icon /></span>
                  <div className="entry-main">
                    <p className="entry-title">{e.title}</p>
                    <p className="entry-meta">{e.meta}</p>
                  </div>
                  <div className={`entry-amt${e.incoming ? ' in' : ''}`}>
                    {e.amount}
                    {e.sub && <small>{e.sub}</small>}
                  </div>
                  {onDelete && (
                    <button className="entry-del" aria-label={`Delete ${e.title}`} onClick={() => onDelete(e)}><Trash2 /></button>
                  )}
                </li>
              )
            })}
          </ul>
        </li>
      ))}
    </ul>
  )
}
