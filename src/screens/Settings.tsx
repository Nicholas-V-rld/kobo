import { useEffect, useState } from 'react'
import { AmountInput, parseAmt, toInput } from '../components/AmountInput'
import { clearCache, useStore } from '../lib/store'
import { useAuthActions } from '@convex-dev/auth/react'
import { BUCKET_HINT, BUCKET_LABEL, BUCKETS, type Bucket, type Data } from '../lib/types'

const KEY: Record<Bucket, 'pct_savings' | 'pct_product' | 'pct_bills' | 'pct_living'> = {
  savings: 'pct_savings', product: 'pct_product', bills: 'pct_bills', living: 'pct_living',
}

function csv(d: Data) {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const rows: unknown[][] = [['type', 'date', 'amount', 'currency', 'amount_before_fees', 'bucket_or_source', 'category_or_client', 'note']]
  for (const i of d.incomes) rows.push(['income', i.date, i.net, i.currency, i.gross, i.source, i.client, i.note])
  for (const c of d.conversions) rows.push(['conversion', c.date, c.ngn, 'NGN', '', `from ${c.usd} USD`, `charges ${c.fee_ngn}`, c.note])
  for (const e of d.expenses) rows.push(['expense', e.date, e.amount_ngn, 'NGN', '', e.bucket, e.category, e.note])
  for (const r of d.returns) rows.push(['product_return', r.date, r.amount_ngn, 'NGN', '', 'product', '', r.note])
  for (const m of d.moves) rows.push(['move', m.date, m.amount_ngn, 'NGN', '', `${m.from_bucket}>${m.to_bucket}`, '', m.note])
  return rows.map((r) => r.map(esc).join(',')).join('\n')
}

export function Settings({ onToast }: { onToast: (s: string) => void }) {
  const { data, email, saveSettings } = useStore()
  const { signOut } = useAuthActions()
  const [pct, setPct] = useState<Record<Bucket, string>>(() => Object.fromEntries(BUCKETS.map((b) => [b, String(data.settings[KEY[b]])])) as Record<Bucket, string>)
  const [cap, setCap] = useState(toInput(data.settings.product_cap_ngn, 'NGN'))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setPct(Object.fromEntries(BUCKETS.map((b) => [b, String(data.settings[KEY[b]])])) as Record<Bucket, string>)
    setCap(toInput(data.settings.product_cap_ngn, 'NGN'))
  }, [data.settings])

  const total = BUCKETS.reduce((s, b) => s + (Number(pct[b]) || 0), 0)
  const valid = Math.abs(total - 100) < 0.01

  const save = async () => {
    setBusy(true)
    const ok = await saveSettings({
      pct_savings: Number(pct.savings), pct_product: Number(pct.product),
      pct_bills: Number(pct.bills), pct_living: Number(pct.living),
      product_cap_ngn: parseAmt(cap),
    })
    setBusy(false)
    if (ok) onToast('Settings saved')
  }

  const exportCsv = () => {
    const blob = new Blob([csv(data)], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `kobo-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <div className="month-nav"><h1>Settings</h1></div>

      <section className="section" style={{ marginTop: 0 }}>
        <div className="section-head"><h2 className="section-title">How each payment is split</h2></div>
        <p className="hint" style={{ margin: '0 0 var(--s4)' }}>Applies to naira income and every conversion from now on. Past entries keep the split they were saved with.</p>
        {BUCKETS.map((b) => (
          <div className="pct-row" key={b}>
            <span><span className="bucket-name">{BUCKET_LABEL[b]}</span><span className="bucket-hint">{BUCKET_HINT[b]}</span></span>
            <label className="pct-input">
              <input inputMode="decimal" aria-label={`${BUCKET_LABEL[b]} percent`} value={pct[b]} onChange={(e) => setPct({ ...pct, [b]: e.target.value.replace(/[^\d.]/g, '') })} />
              <span>%</span>
            </label>
          </div>
        ))}
        <div className="pct-total"><span>Total</span><b className={valid ? '' : 'warn'}>{total}%{valid ? '' : ' (must be 100%)'}</b></div>
      </section>

      <section className="section">
        <div className="section-head"><h2 className="section-title">Product limit</h2></div>
        <AmountInput label="Most you'll spend on product in a month" currency="NGN" value={cap} onChange={setCap} />
      </section>

      <div style={{ marginTop: 'var(--s6)' }}>
        <button className="btn btn-primary btn-block" disabled={!valid || busy} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button>
      </div>

      <section className="section">
        <div className="section-head"><h2 className="section-title">Your data</h2></div>
        <div className="kv"><span>Signed in as</span><b style={{ fontFamily: 'var(--font-text)', fontWeight: 500 }}>{email}</b></div>
        <div style={{ display: 'grid', gap: 'var(--s3)', marginTop: 'var(--s5)' }}>
          <button className="btn btn-quiet btn-block" onClick={exportCsv}>Download everything as CSV</button>
          <button className="btn btn-quiet btn-block" onClick={async () => { clearCache(); await signOut() }}>Sign out</button>
        </div>
      </section>
    </>
  )
}
