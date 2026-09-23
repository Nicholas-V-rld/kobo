import { useMemo } from 'react'
import type { AddKind } from '../components/AddSheet'
import { buildEntries, EntryList } from '../components/EntryList'
import { balances, daysLeftInMonth, monthKey, ngn, today, usd, usdWallet } from '../lib/money'
import { useStore } from '../lib/store'
import { BUCKET_HINT, BUCKET_LABEL, BUCKETS } from '../lib/types'

export function Home({ onAdd, onSeeAll }: { onAdd: (k: AddKind) => void; onSeeAll: () => void }) {
  const { data } = useStore()
  const bal = useMemo(() => balances(data), [data])
  const wallet = usdWallet(data)
  const days = daysLeftInMonth()
  const safe = Math.max(0, bal.living) / days
  const month = monthKey(today())

  const productSpent = data.expenses.filter((e) => e.bucket === 'product' && monthKey(e.date) === month).reduce((s, e) => s + e.amount_ngn, 0)
  const productReturned = data.returns.filter((r) => monthKey(r.date) === month).reduce((s, r) => s + r.amount_ngn, 0)
  const cap = data.settings.product_cap_ngn
  const capUsed = cap > 0 ? productSpent / cap : 0
  const net = productReturned - productSpent

  const entries = useMemo(() => buildEntries(data).slice(0, 6), [data])
  const nothingYet = entries.length === 0

  return (
    <>
      <section className="hero">
        <p className="hero-label">Safe to spend today</p>
        <p className="hero-value"><span className="unit">₦</span>{new Intl.NumberFormat('en-NG').format(Math.floor(safe))}</p>
        <p className="hero-sub">
          {nothingYet
            ? 'Log your first income or conversion and this fills in.'
            : `${ngn(Math.max(0, bal.living))} left in Living, spread over the ${days} ${days === 1 ? 'day' : 'days'} left this month.`}
        </p>
      </section>

      <section className="section">
        <div className="wallet">
          <div>
            <p className="wallet-label">Dollars not yet converted</p>
            <p className="wallet-value">{usd(wallet)}</p>
          </div>
          {wallet > 0
            ? <button className="btn btn-primary btn-sm" onClick={() => onAdd('convert')}>Convert</button>
            : <button className="btn btn-quiet btn-sm" onClick={() => onAdd('income')}>Add income</button>}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Buckets</h2>
          <button className="link-btn" onClick={() => onAdd('move')}>Move money</button>
        </div>
        <ul className="buckets">
          {BUCKETS.map((b) => (
            <li className="bucket" key={b}>
              <div className="bucket-row">
                <span>
                  <span className="bucket-name">{BUCKET_LABEL[b]}</span>
                  <span className="bucket-hint">{BUCKET_HINT[b]}</span>
                </span>
                <span className={`bucket-value${bal[b] < 0 ? ' neg' : ''}`}>{ngn(bal[b])}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <div className="product">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <h2 className="section-title">Product this month</h2>
            <span className="section-aside">Limit {ngn(cap)}</span>
          </div>
          <div className={`meter accent${capUsed > 1 ? ' over' : ''}`} role="meter" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={productSpent} aria-label="Product spending against limit">
            <span style={{ transform: `scaleX(${Math.min(1, capUsed)})`, width: '100%' }} />
          </div>
          <div className="meter-note">
            <span>{ngn(productSpent)} spent</span>
            {capUsed > 1
              ? <span className="warn">{ngn(productSpent - cap)} over limit</span>
              : capUsed >= 0.8
                ? <span className="warn">{ngn(cap - productSpent)} left</span>
                : <span>{ngn(Math.max(0, cap - productSpent))} left</span>}
          </div>
          <div className="product-grid">
            <div>
              <p className="stat-label">Paid back</p>
              <p className="stat-value">{ngn(productReturned)}</p>
            </div>
            <div>
              <p className="stat-label">Business result</p>
              <p className={`stat-value ${net >= 0 ? 'good' : 'warn'}`}>{net >= 0 ? `+${ngn(net)}` : ngn(net)}</p>
            </div>
          </div>
          {productSpent > 0 && (
            <p className="product-verdict">
              {net >= 0
                ? <>The business <strong>paid for itself</strong> this month.</>
                : <>Product has cost you <strong>{ngn(-net)}</strong> more than it brought back this month.</>}
            </p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Recent</h2>
          {!nothingYet && <button className="link-btn" onClick={onSeeAll}>See all</button>}
        </div>
        {nothingYet
          ? <p className="empty">Nothing logged yet. Tap the + button to add money you made or spent today.</p>
          : <EntryList entries={entries} />}
      </section>
    </>
  )
}
