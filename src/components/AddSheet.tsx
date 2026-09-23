import { X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { lastRate, ngn, today, usd, usdWallet } from '../lib/money'
import { useStore } from '../lib/store'
import {
  BUCKET_LABEL, BUCKETS, CATEGORY_SUGGESTIONS, SOURCE_LABEL, SOURCES, splitFromSettings,
  type Bucket, type Source, type Split,
} from '../lib/types'
import { AmountInput, parseAmt, toInput } from './AmountInput'

export type AddKind = 'spend' | 'income' | 'convert' | 'return' | 'move'

const KINDS: { id: AddKind; label: string }[] = [
  { id: 'spend', label: 'Spend' },
  { id: 'income', label: 'Income' },
  { id: 'convert', label: 'Convert $' },
  { id: 'return', label: 'Product return' },
  { id: 'move', label: 'Move' },
]

const PLATFORM_CUT: Partial<Record<Source, number>> = { upwork: 0.1, fiverr: 0.2 }

type Props = { initial: AddKind; onClose: () => void; onSaved: (msg: string) => void }

export function AddSheet({ initial, onClose, onSaved }: Props) {
  const [kind, setKind] = useState<AddKind>(initial)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h2 className="sheet-title" id="sheet-title">Add</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="seg" role="group" aria-label="Entry type">
          {KINDS.map((k) => (
            <button key={k.id} aria-pressed={kind === k.id} onClick={() => setKind(k.id)}>{k.label}</button>
          ))}
        </div>
        {kind === 'spend' && <SpendForm onSaved={onSaved} />}
        {kind === 'income' && <IncomeForm onSaved={onSaved} />}
        {kind === 'convert' && <ConvertForm onSaved={onSaved} />}
        {kind === 'return' && <ReturnForm onSaved={onSaved} />}
        {kind === 'move' && <MoveForm onSaved={onSaved} />}
      </div>
    </>
  )
}

type FormProps = { onSaved: (msg: string) => void }

function useSubmit() {
  const { insert } = useStore()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const run = async (fn: () => Promise<boolean>, onOk: () => void) => {
    setBusy(true)
    setErr(null)
    const ok = await fn()
    setBusy(false)
    if (ok) onOk()
    else setErr('Could not save. Check your connection and try again.')
  }
  return { insert, busy, err, setErr, run }
}

function DateNote({ date, setDate, note, setNote, notePlaceholder = 'Optional' }: {
  date: string; setDate: (s: string) => void; note: string; setNote: (s: string) => void; notePlaceholder?: string
}) {
  return (
    <div className="row2">
      <label className="field">
        <span>Date</span>
        <input type="date" className="input" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="field">
        <span>Note</span>
        <input className="input" value={note} placeholder={notePlaceholder} onChange={(e) => setNote(e.target.value)} />
      </label>
    </div>
  )
}

function SplitPreview({ amount, split }: { amount: number; split: Split }) {
  if (!amount) return null
  return (
    <div className="preview" aria-live="polite">
      {BUCKETS.map((b) => (
        <div className="preview-row" key={b}>
          <span>{BUCKET_LABEL[b]} · {split[b]}%</span>
          <b>{ngn((amount * split[b]) / 100)}</b>
        </div>
      ))}
    </div>
  )
}

/* ---------------- spend ---------------- */
function SpendForm({ onSaved }: FormProps) {
  const { data } = useStore()
  const { insert, busy, err, run } = useSubmit()
  const [amt, setAmt] = useState('')
  const [bucket, setBucket] = useState<Bucket>('living')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')

  const suggestions = useMemo(() => {
    const used = data.expenses.filter((e) => e.bucket === bucket).map((e) => e.category)
    return [...new Set([...CATEGORY_SUGGESTIONS[bucket], ...used])]
  }, [data.expenses, bucket])

  const amount = parseAmt(amt)
  const valid = amount > 0 && category.trim().length > 0

  return (
    <form className="form" onSubmit={(e) => {
      e.preventDefault()
      if (!valid) return
      run(() => insert('expenses', { amount_ngn: amount, bucket, category: category.trim(), date, note: note || null }),
        () => onSaved(`${ngn(amount)} logged`))
    }}>
      <AmountInput big autoFocus label="How much did you spend?" currency="NGN" value={amt} onChange={setAmt} />
      <div className="field">
        <span className="label">From which bucket</span>
        <div className="chips">
          {BUCKETS.map((b) => (
            <button type="button" key={b} className="chip" aria-pressed={bucket === b} onClick={() => { setBucket(b); setCategory('') }}>
              {BUCKET_LABEL[b]}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">On what</span>
        <div className="chips">
          {suggestions.map((c) => (
            <button type="button" key={c} className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
        <input className="input" placeholder="Or type your own" value={suggestions.includes(category) ? '' : category} onChange={(e) => setCategory(e.target.value)} />
      </div>
      <DateNote date={date} setDate={setDate} note={note} setNote={setNote} />
      {err && <p className="err">{err}</p>}
      <button className="btn btn-primary btn-block" disabled={!valid || busy}>{busy ? 'Saving…' : 'Save spend'}</button>
    </form>
  )
}

/* ---------------- income ---------------- */
function IncomeForm({ onSaved }: FormProps) {
  const { data } = useStore()
  const { insert, busy, err, run } = useSubmit()
  const [currency, setCurrency] = useState<'USD' | 'NGN'>('USD')
  const [source, setSource] = useState<Source>('upwork')
  const [gross, setGross] = useState('')
  const [net, setNet] = useState('')
  const [netTouched, setNetTouched] = useState(false)
  const [client, setClient] = useState('')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')

  // auto-fill "you received" from the platform's cut until the user edits it
  useEffect(() => {
    if (netTouched) return
    const g = parseAmt(gross)
    const cut = currency === 'USD' ? PLATFORM_CUT[source] ?? 0 : 0
    setNet(g ? toInput(g * (1 - cut), currency) : '')
  }, [gross, source, currency, netTouched])

  const clients = useMemo(() => [...new Set(data.incomes.map((i) => i.client).filter(Boolean))] as string[], [data.incomes])
  const g = parseAmt(gross)
  const n = parseAmt(net)
  const valid = g > 0 && n > 0 && n <= g
  const split = splitFromSettings(data.settings)

  return (
    <form className="form" onSubmit={(e) => {
      e.preventDefault()
      if (!valid) return
      run(() => insert('incomes', {
        currency, source, gross: g, net: n, client: client.trim() || null, date, note: note || null,
        split: currency === 'NGN' ? split : null,
      }), () => onSaved(`${currency === 'USD' ? usd(n) : ngn(n)} from ${SOURCE_LABEL[source]}`))
    }}>
      <div className="chips" role="group" aria-label="Currency">
        <button type="button" className="chip" aria-pressed={currency === 'USD'} onClick={() => setCurrency('USD')}>Dollars</button>
        <button type="button" className="chip" aria-pressed={currency === 'NGN'} onClick={() => setCurrency('NGN')}>Naira</button>
      </div>
      <AmountInput big autoFocus label="What the client paid" currency={currency} value={gross} onChange={(v) => { setGross(v) }} />
      <div className="field">
        <span className="label">Where it came from</span>
        <div className="chips">
          {SOURCES.map((s) => (
            <button type="button" key={s} className="chip" aria-pressed={source === s} onClick={() => setSource(s)}>{SOURCE_LABEL[s]}</button>
          ))}
        </div>
      </div>
      <AmountInput label="What you actually received, after fees" currency={currency} value={net} onChange={(v) => { setNetTouched(true); setNet(v) }} />
      {currency === 'USD' && PLATFORM_CUT[source] && !netTouched && (
        <p className="hint">Filled in with {SOURCE_LABEL[source]}'s {PLATFORM_CUT[source]! * 100}% fee. Change it if yours was different.</p>
      )}
      {g > 0 && n > g && <p className="err">What you received can't be more than what the client paid.</p>}
      <label className="field">
        <span>Client</span>
        <input className="input" list="clients" value={client} placeholder="Optional" onChange={(e) => setClient(e.target.value)} />
        <datalist id="clients">{clients.map((c) => <option key={c} value={c} />)}</datalist>
      </label>
      <DateNote date={date} setDate={setDate} note={note} setNote={setNote} />
      {currency === 'USD'
        ? <p className="hint">Dollars wait in your dollar balance. They get split into buckets when you convert them to naira.</p>
        : <SplitPreview amount={n} split={split} />}
      {err && <p className="err">{err}</p>}
      <button className="btn btn-primary btn-block" disabled={!valid || busy}>{busy ? 'Saving…' : 'Save income'}</button>
    </form>
  )
}

/* ---------------- convert ---------------- */
function ConvertForm({ onSaved }: FormProps) {
  const { data } = useStore()
  const { insert, busy, err, run } = useSubmit()
  const wallet = usdWallet(data)
  const [usdAmt, setUsdAmt] = useState(wallet > 0 ? toInput(wallet, 'USD') : '')
  const [ngnAmt, setNgnAmt] = useState('')
  const [fee, setFee] = useState('')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const split = splitFromSettings(data.settings)
  const prev = lastRate(data)

  const u = parseAmt(usdAmt)
  const nAmt = parseAmt(ngnAmt)
  const valid = u > 0 && nAmt > 0
  const rate = valid ? nAmt / u : null

  return (
    <form className="form" onSubmit={(e) => {
      e.preventDefault()
      if (!valid) return
      run(() => insert('conversions', { usd: u, ngn: nAmt, fee_ngn: parseAmt(fee), split, date, note: note || null }),
        () => onSaved(`${ngn(nAmt)} split into buckets`))
    }}>
      <AmountInput big label="Dollars you converted" currency="USD" value={usdAmt} onChange={setUsdAmt} />
      <p className="hint">Dollar balance right now: {usd(wallet)}</p>
      {u > wallet + 0.001 && <p className="err">That's more than your logged dollar balance. Log the income first if it's missing.</p>}
      <AmountInput big autoFocus label="Naira that landed in your account" currency="NGN" value={ngnAmt} onChange={setNgnAmt} />
      <AmountInput label="Charges you paid (optional)" currency="NGN" value={fee} onChange={setFee} />
      {rate && (
        <div className="preview">
          <div className="preview-row"><span>Your rate</span><b>{ngn(rate)} per $1</b></div>
          {prev && <div className="preview-row"><span>Last time</span><b>{ngn(prev)} per $1</b></div>}
        </div>
      )}
      <SplitPreview amount={nAmt} split={split} />
      <DateNote date={date} setDate={setDate} note={note} setNote={setNote} notePlaceholder="e.g. Grey, Payoneer" />
      {err && <p className="err">{err}</p>}
      <button className="btn btn-primary btn-block" disabled={!valid || busy}>{busy ? 'Saving…' : 'Convert and split'}</button>
    </form>
  )
}

/* ---------------- product return ---------------- */
function ReturnForm({ onSaved }: FormProps) {
  const { insert, busy, err, run } = useSubmit()
  const [amt, setAmt] = useState('')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const amount = parseAmt(amt)
  return (
    <form className="form" onSubmit={(e) => {
      e.preventDefault()
      if (!amount) return
      run(() => insert('product_returns', { amount_ngn: amount, date, note: note || null }), () => onSaved(`${ngn(amount)} back from the business`))
    }}>
      <AmountInput big autoFocus label="Money the business paid back" currency="NGN" value={amt} onChange={setAmt} />
      <p className="hint">Sales, commissions or bonuses from network marketing. It goes into your Product bucket so the business can pay for its own stock.</p>
      <DateNote date={date} setDate={setDate} note={note} setNote={setNote} notePlaceholder="e.g. Customer sale" />
      {err && <p className="err">{err}</p>}
      <button className="btn btn-primary btn-block" disabled={!amount || busy}>{busy ? 'Saving…' : 'Save return'}</button>
    </form>
  )
}

/* ---------------- move between buckets ---------------- */
function MoveForm({ onSaved }: FormProps) {
  const { insert, busy, err, run } = useSubmit()
  const [amt, setAmt] = useState('')
  const [from, setFrom] = useState<Bucket>('living')
  const [to, setTo] = useState<Bucket>('savings')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const amount = parseAmt(amt)
  const valid = amount > 0 && from !== to
  return (
    <form className="form" onSubmit={(e) => {
      e.preventDefault()
      if (!valid) return
      run(() => insert('moves', { amount_ngn: amount, from_bucket: from, to_bucket: to, date, note: note || null }),
        () => onSaved(`Moved ${ngn(amount)} to ${BUCKET_LABEL[to]}`))
    }}>
      <AmountInput big autoFocus label="How much to move" currency="NGN" value={amt} onChange={setAmt} />
      <div className="field">
        <span className="label">From</span>
        <div className="chips">
          {BUCKETS.map((b) => <button type="button" key={b} className="chip" aria-pressed={from === b} onClick={() => setFrom(b)}>{BUCKET_LABEL[b]}</button>)}
        </div>
      </div>
      <div className="field">
        <span className="label">To</span>
        <div className="chips">
          {BUCKETS.map((b) => <button type="button" key={b} className="chip" aria-pressed={to === b} onClick={() => setTo(b)}>{BUCKET_LABEL[b]}</button>)}
        </div>
      </div>
      {from === to && <p className="err">Pick two different buckets.</p>}
      <DateNote date={date} setDate={setDate} note={note} setNote={setNote} />
      {err && <p className="err">{err}</p>}
      <button className="btn btn-primary btn-block" disabled={!valid || busy}>{busy ? 'Saving…' : 'Move money'}</button>
    </form>
  )
}
