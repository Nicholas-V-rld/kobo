import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export const bucket = v.union(v.literal('savings'), v.literal('product'), v.literal('bills'), v.literal('living'))
export const source = v.union(v.literal('upwork'), v.literal('fiverr'), v.literal('outreach'), v.literal('referral'), v.literal('other'))
export const split = v.object({ savings: v.number(), product: v.number(), bills: v.number(), living: v.number() })

export default defineSchema({
  ...authTables,

  settings: defineTable({
    userId: v.id('users'),
    pct_savings: v.number(),
    pct_product: v.number(),
    pct_bills: v.number(),
    pct_living: v.number(),
    product_cap_ngn: v.number(),
  }).index('by_userId', ['userId']),

  incomes: defineTable({
    userId: v.id('users'),
    date: v.string(),
    source,
    client: v.union(v.string(), v.null()),
    currency: v.union(v.literal('USD'), v.literal('NGN')),
    gross: v.number(),
    net: v.number(),
    split: v.union(split, v.null()),
    note: v.union(v.string(), v.null()),
  }).index('by_userId_and_date', ['userId', 'date']),

  conversions: defineTable({
    userId: v.id('users'),
    date: v.string(),
    usd: v.number(),
    ngn: v.number(),
    fee_ngn: v.number(),
    split,
    note: v.union(v.string(), v.null()),
  }).index('by_userId_and_date', ['userId', 'date']),

  expenses: defineTable({
    userId: v.id('users'),
    date: v.string(),
    amount_ngn: v.number(),
    bucket,
    category: v.string(),
    note: v.union(v.string(), v.null()),
  }).index('by_userId_and_date', ['userId', 'date']),

  product_returns: defineTable({
    userId: v.id('users'),
    date: v.string(),
    amount_ngn: v.number(),
    note: v.union(v.string(), v.null()),
  }).index('by_userId_and_date', ['userId', 'date']),

  moves: defineTable({
    userId: v.id('users'),
    date: v.string(),
    from_bucket: bucket,
    to_bucket: bucket,
    amount_ngn: v.number(),
    note: v.union(v.string(), v.null()),
  }).index('by_userId_and_date', ['userId', 'date']),
})
