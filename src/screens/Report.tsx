import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { monthKey, monthLabel, monthSummary, ngn, shiftMonth, today, usd } from '../lib/money'
import { useStore } from '../lib/store'
import { BUCKET_LABEL, BUCKETS, SOURCE_LABEL, type Source } from '../lib/types'

function Delta({ now, prev, invert, fmt }: { now: number; prev: number; invert?: boolean; fmt: (n: number) => string }) {
  if (!prev) return <span className="delta">No data last month</span>
  const diff = now - prev
  if (Math.abs(diff) < 0.5) return <span className="delta">Same as last month</span>
  const better = invert ? diff < 0 : diff > 0
  return <span className={`delta ${better ? 'up' : 'down'}`}>{diff > 0 ? '+' : '−'}{fmt(Math.abs(diff))} vs last month</span>
}

function Bars({ rows }: { rows: { label: string; value: number; display: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ul className="bar-list">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="bar-top"><span>{r.label}</span><b>{r.display}</b></div>
          <div className="meter"><span style={{ width: '100%', transform: `scaleX(${r.value / max})` }} /></div>
        </li>
      ))}
    </ul>
  )
}

export function Report() {
  const { data } = useStore()
  const current = monthKey(today())
  const [key, setKey] = useState(current)
  const s = useMemo(() => monthSummary(data, key), [data, key])
  const p = useMemo(() => monthSummary(data, shiftMonth(key, -1)), [data, key])

  const sources = (Object.keys(s.bySource) as Source[])
    .map((k) => ({ k, ...s.bySource[k] }))
    .sort((a, b) => b.usd - a.usd || b.ngn - a.ngn)
  const cats = Object.entries(s.byCategory).sort((a, b) => b[1] - a[1])
  const empty = !s.earnedUsd && !s.earnedNgn && !s.totalSpent && !s.convUsd

  return (
    <>
      <div className="month-nav">
        <button className="icon-btn" aria-label="Previous month" onClick={() => setKey(shiftMonth(key, -1))}><ChevronLeft /></button>
        <h1>{monthLabel(key)}</h1>
        <button className="icon-btn" aria-label="Next month" disabled={key >= current} style={{ opacity: key >= current ? 0.3 : 1 }} onClick={() => setKey(shiftMonth(key, 1))}><ChevronRight /></button>
      </div>

      {empty ? <p className="empty">Nothing logged for {monthLabel(key)}.</p> : (
        <>
          <div className="lead-stat">
            <div>
              <p className="stat-label">Earned</p>
              <p className="big">{usd(s.earnedUsd)}</p>
              {s.earnedNgn > 0 && <p className="stat-label">+ {ngn(s.earnedNgn)}</p>}
              <Delta now={s.earnedUsd} prev={p.earnedUsd} fmt={usd} />
            </div>
            <div>
              <p className="stat-label">Spent</p>
              <p className="big">{ngn(s.totalSpent)}</p>
              <Delta now={s.totalSpent} prev={p.totalSpent} invert fmt={ngn} />
            </div>
          </div>

          <section className="section" style={{ marginTop: 0 }}>
            <div className="section-head"><h2 className="section-title">Saved</h2></div>
            <div className="kv"><span>Went into Savings</span><b>{ngn(s.alloc.savings)}</b></div>
            <div className="kv"><span>Actually kept</span><b className={s.saved >= s.alloc.savings * 0.999 ? 'good' : 'warn'}>{ngn(s.saved)}</b></div>
          </section>

          {sources.length > 0 && (
            <section className="section">
              <div className="section-head"><h2 className="section-title">Where the money came from</h2></div>
              <Bars rows={sources.map((x) => ({
                label: SOURCE_LABEL[x.k],
                value: x.usd || x.ngn / (s.avgRate ?? 1500),
                display: [x.usd ? usd(x.usd) : '', x.ngn ? ngn(x.ngn) : ''].filter(Boolean).join(' + '),
              }))} />
            </section>
          )}

          <section className="section">
            <div className="section-head"><h2 className="section-title">Lost to fees</h2></div>
            <div className="kv"><span>Platform fees</span><b className={s.feesUsd ? 'warn' : ''}>{usd(s.feesUsd)}{s.feesNgn ? ` + ${ngn(s.feesNgn)}` : ''}</b></div>
            <div className="kv"><span>Conversion charges</span><b className={s.convFees ? 'warn' : ''}>{ngn(s.convFees)}</b></div>
            {s.avgRate && <div className="kv"><span>Average rate you got</span><b>{ngn(s.avgRate)} / $1</b></div>}
            <div className="kv"><span>Dollars converted</span><b>{usd(s.convUsd)} → {ngn(s.convNgn)}</b></div>
          </section>

          <section className="section">
            <div className="section-head"><h2 className="section-title">Buckets</h2><span className="section-aside">in / out</span></div>
            {BUCKETS.map((b) => (
              <div className="kv" key={b}>
                <span>{BUCKET_LABEL[b]}</span>
                <b className={s.spent[b] > s.alloc[b] && s.spent[b] > 0 ? 'warn' : ''}>{ngn(s.alloc[b])} / {ngn(s.spent[b])}</b>
              </div>
            ))}
            {s.returned > 0 && <p className="hint" style={{ marginTop: 'var(--s3)' }}>Product includes {ngn(s.returned)} paid back by the business.</p>}
          </section>

          {cats.length > 0 && (
            <section className="section">
              <div className="section-head"><h2 className="section-title">Spending by category</h2></div>
              <Bars rows={cats.map(([label, value]) => ({ label, value, display: ngn(value) }))} />
            </section>
          )}
        </>
      )}
    </>
  )
}
