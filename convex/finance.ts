import { getAuthUserId } from '@convex-dev/auth/server'
import { ConvexError, v } from 'convex/values'
import { mutation, query, type MutationCtx } from './_generated/server'
import { bucket, source, split } from './schema'

const DATE = /^\d{4}-\d{2}-\d{2}$/
// A person logging a few entries a day stays far below this for years.
const MAX_ROWS = 5000
const TABLES = ['incomes', 'conversions', 'expenses', 'product_returns', 'moves'] as const
const note = v.optional(v.union(v.string(), v.null()))

async function requireUser(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new ConvexError('Not signed in')
  return userId
}

function checkDate(date: string) {
  if (!DATE.test(date)) throw new ConvexError('Invalid date')
}

function checkAmount(...ns: number[]) {
  for (const n of ns) if (!Number.isFinite(n) || n < 0 || n > 1e12) throw new ConvexError('Invalid amount')
}

function checkSplit(s: { savings: number; product: number; bills: number; living: number }) {
  const vals = [s.savings, s.product, s.bills, s.living]
  checkAmount(...vals)
  if (Math.abs(vals.reduce((a, b) => a + b, 0) - 100) > 0.01) throw new ConvexError('Split must add up to 100%')
}

const clean = (s: string | null | undefined) => (s && s.trim() ? s.trim().slice(0, 200) : null)

/** Everything the signed-in user has logged. Personal datasets stay small, so one query feeds the whole app. */
export const all = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const [settings, incomes, conversions, expenses, returns, moves] = await Promise.all([
      ctx.db.query('settings').withIndex('by_userId', (q) => q.eq('userId', userId)).unique(),
      ctx.db.query('incomes').withIndex('by_userId_and_date', (q) => q.eq('userId', userId)).order('desc').take(MAX_ROWS),
      ctx.db.query('conversions').withIndex('by_userId_and_date', (q) => q.eq('userId', userId)).order('desc').take(MAX_ROWS),
      ctx.db.query('expenses').withIndex('by_userId_and_date', (q) => q.eq('userId', userId)).order('desc').take(MAX_ROWS),
      ctx.db.query('product_returns').withIndex('by_userId_and_date', (q) => q.eq('userId', userId)).order('desc').take(MAX_ROWS),
      ctx.db.query('moves').withIndex('by_userId_and_date', (q) => q.eq('userId', userId)).order('desc').take(MAX_ROWS),
    ])
    const user = await ctx.db.get('users', userId)
    return { email: user?.email ?? null, settings, incomes, conversions, expenses, returns, moves }
  },
})

export const addIncome = mutation({
  args: {
    date: v.string(), source, client: note,
    currency: v.union(v.literal('USD'), v.literal('NGN')),
    gross: v.number(), net: v.number(), split: v.union(split, v.null()), note,
  },
  handler: async (ctx, a) => {
    const userId = await requireUser(ctx)
    checkDate(a.date)
    checkAmount(a.gross, a.net)
    if (a.net <= 0 || a.net > a.gross) throw new ConvexError('Received must be above zero and not more than paid')
    if (a.currency === 'NGN' && !a.split) throw new ConvexError('Naira income needs a split')
    if (a.split) checkSplit(a.split)
    return ctx.db.insert('incomes', {
      userId, date: a.date, source: a.source, client: clean(a.client), currency: a.currency,
      gross: a.gross, net: a.net, split: a.currency === 'NGN' ? a.split : null, note: clean(a.note),
    })
  },
})

export const addConversion = mutation({
  args: { date: v.string(), usd: v.number(), ngn: v.number(), fee_ngn: v.number(), split, note },
  handler: async (ctx, a) => {
    const userId = await requireUser(ctx)
    checkDate(a.date)
    checkAmount(a.usd, a.ngn, a.fee_ngn)
    if (a.usd <= 0 || a.ngn <= 0) throw new ConvexError('Amounts must be above zero')
    checkSplit(a.split)
    return ctx.db.insert('conversions', { userId, date: a.date, usd: a.usd, ngn: a.ngn, fee_ngn: a.fee_ngn, split: a.split, note: clean(a.note) })
  },
})

export const addExpense = mutation({
  args: { date: v.string(), amount_ngn: v.number(), bucket, category: v.string(), note },
  handler: async (ctx, a) => {
    const userId = await requireUser(ctx)
    checkDate(a.date)
    checkAmount(a.amount_ngn)
    if (a.amount_ngn <= 0) throw new ConvexError('Amount must be above zero')
    const category = clean(a.category)
    if (!category) throw new ConvexError('Category is required')
    return ctx.db.insert('expenses', { userId, date: a.date, amount_ngn: a.amount_ngn, bucket: a.bucket, category, note: clean(a.note) })
  },
})

export const addReturn = mutation({
  args: { date: v.string(), amount_ngn: v.number(), note },
  handler: async (ctx, a) => {
    const userId = await requireUser(ctx)
    checkDate(a.date)
    checkAmount(a.amount_ngn)
    if (a.amount_ngn <= 0) throw new ConvexError('Amount must be above zero')
    return ctx.db.insert('product_returns', { userId, date: a.date, amount_ngn: a.amount_ngn, note: clean(a.note) })
  },
})

export const addMove = mutation({
  args: { date: v.string(), amount_ngn: v.number(), from_bucket: bucket, to_bucket: bucket, note },
  handler: async (ctx, a) => {
    const userId = await requireUser(ctx)
    checkDate(a.date)
    checkAmount(a.amount_ngn)
    if (a.amount_ngn <= 0) throw new ConvexError('Amount must be above zero')
    if (a.from_bucket === a.to_bucket) throw new ConvexError('Pick two different buckets')
    return ctx.db.insert('moves', { userId, date: a.date, amount_ngn: a.amount_ngn, from_bucket: a.from_bucket, to_bucket: a.to_bucket, note: clean(a.note) })
  },
})

export const remove = mutation({
  args: {
    table: v.union(...TABLES.map((t) => v.literal(t))),
    id: v.string(),
  },
  handler: async (ctx, { table, id }) => {
    const userId = await requireUser(ctx)
    const docId = ctx.db.normalizeId(table, id)
    const doc = docId && (await ctx.db.get(table, docId))
    if (!docId || !doc || doc.userId !== userId) throw new ConvexError('Not found')
    await ctx.db.delete(table, docId)
  },
})

export const saveSettings = mutation({
  args: { pct_savings: v.number(), pct_product: v.number(), pct_bills: v.number(), pct_living: v.number(), product_cap_ngn: v.number() },
  handler: async (ctx, a) => {
    const userId = await requireUser(ctx)
    checkSplit({ savings: a.pct_savings, product: a.pct_product, bills: a.pct_bills, living: a.pct_living })
    checkAmount(a.product_cap_ngn)
    const existing = await ctx.db.query('settings').withIndex('by_userId', (q) => q.eq('userId', userId)).unique()
    if (existing) await ctx.db.patch('settings', existing._id, a)
    else await ctx.db.insert('settings', { userId, ...a })
  },
})
