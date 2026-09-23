import { BUCKETS, type Bucket, type Data, type Split } from './types'

const ngnFmt = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 })
const usdFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const ngn = (n: number) => `${n < 0 ? '−' : ''}₦${ngnFmt.format(Math.abs(Math.round(n)))}`
export const usd = (n: number) => `${n < 0 ? '−' : ''}$${usdFmt.format(Math.abs(n))}`
export const money = (n: number, cur: 'USD' | 'NGN') => (cur === 'USD' ? usd(n) : ngn(n))

export function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const monthKey = (date: string) => date.slice(0, 7)

export function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

export function shiftMonth(key: string, by: number) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + by, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function prettyDate(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const t = today()
  if (date === t) return 'Today'
  const yest = new Date()
  yest.setDate(yest.getDate() - 1)
  if (dt.toDateString() === yest.toDateString()) return 'Yesterday'
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export const zeroBuckets = (): Record<Bucket, number> => ({ savings: 0, product: 0, bills: 0, living: 0 })

function addSplit(acc: Record<Bucket, number>, amount: number, split: Split) {
  for (const b of BUCKETS) acc[b] += (amount * (split[b] ?? 0)) / 100
}

type Filter = (date: string) => boolean
const all: Filter = () => true

/** Naira that has landed in each bucket (income in naira + conversions), before spending. */
export function allocations(d: Data, f: Filter = all) {
  const acc = zeroBuckets()
  for (const i of d.incomes) if (i.currency === 'NGN' && i.split && f(i.date)) addSplit(acc, i.net, i.split)
  for (const c of d.conversions) if (f(c.date)) addSplit(acc, c.ngn, c.split)
  for (const r of d.returns) if (f(r.date)) acc.product += r.amount_ngn
  return acc
}

export function spending(d: Data, f: Filter = all) {
  const acc = zeroBuckets()
  for (const e of d.expenses) if (f(e.date)) acc[e.bucket] += e.amount_ngn
  return acc
}

export function balances(d: Data) {
  const bal = allocations(d)
  const spent = spending(d)
  for (const b of BUCKETS) bal[b] -= spent[b]
  for (const m of d.moves) {
    bal[m.from_bucket] -= m.amount_ngn
    bal[m.to_bucket] += m.amount_ngn
  }
  return bal
}

/** Dollars earned but not yet converted to naira. */
export function usdWallet(d: Data) {
  const earned = d.incomes.filter((i) => i.currency === 'USD').reduce((s, i) => s + i.net, 0)
  const converted = d.conversions.reduce((s, c) => s + c.usd, 0)
  return earned - converted
}

export function daysLeftInMonth() {
  const n = new Date()
  const last = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate()
  return last - n.getDate() + 1
}

export function lastRate(d: Data): number | null {
  const c = [...d.conversions].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))[0]
  return c ? c.ngn / c.usd : null
}

export function monthSummary(d: Data, key: string) {
  const inMonth: Filter = (date) => monthKey(date) === key
  const inc = d.incomes.filter((i) => inMonth(i.date))
  const bySource: Record<string, { usd: number; ngn: number }> = {}
  let feesUsd = 0
  let feesNgn = 0
  let earnedUsd = 0
  let earnedNgn = 0
  for (const i of inc) {
    bySource[i.source] ??= { usd: 0, ngn: 0 }
    if (i.currency === 'USD') {
      bySource[i.source].usd += i.net
      earnedUsd += i.net
      feesUsd += i.gross - i.net
    } else {
      bySource[i.source].ngn += i.net
      earnedNgn += i.net
      feesNgn += i.gross - i.net
    }
  }
  const conv = d.conversions.filter((c) => inMonth(c.date))
  const convUsd = conv.reduce((s, c) => s + c.usd, 0)
  const convNgn = conv.reduce((s, c) => s + c.ngn, 0)
  const convFees = conv.reduce((s, c) => s + c.fee_ngn, 0)

  const exp = d.expenses.filter((e) => inMonth(e.date))
  const byCategory: Record<string, number> = {}
  for (const e of exp) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount_ngn
  const spent = spending(d, inMonth)
  const totalSpent = exp.reduce((s, e) => s + e.amount_ngn, 0)
  const alloc = allocations(d, inMonth)
  const returned = d.returns.filter((r) => inMonth(r.date)).reduce((s, r) => s + r.amount_ngn, 0)

  let savedMoves = 0
  for (const m of d.moves.filter((m) => inMonth(m.date))) {
    if (m.to_bucket === 'savings') savedMoves += m.amount_ngn
    if (m.from_bucket === 'savings') savedMoves -= m.amount_ngn
  }
  const saved = alloc.savings - spent.savings + savedMoves

  return {
    bySource, earnedUsd, earnedNgn, feesUsd, feesNgn,
    convUsd, convNgn, convFees, avgRate: convUsd ? convNgn / convUsd : null,
    byCategory, spent, totalSpent, alloc, returned, saved,
    landedNgn: BUCKETS.reduce((s, b) => s + alloc[b], 0),
  }
}
