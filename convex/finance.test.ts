/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
const split = { savings: 20, product: 30, bills: 25, living: 25 }

async function asUser(t: ReturnType<typeof convexTest>, email: string) {
  const userId = await t.run((ctx) => ctx.db.insert('users', { email }))
  // Convex Auth identities carry "userId|sessionId" in the subject
  return t.withIdentity({ subject: `${userId}|session`, email })
}

describe('finance', () => {
  test('signed-out callers see nothing and cannot write', async () => {
    const t = convexTest(schema, modules)
    expect(await t.query(api.finance.all, {})).toBeNull()
    await expect(t.mutation(api.finance.addReturn, { date: '2026-09-01', amount_ngn: 10 })).rejects.toThrow()
  })

  test('each user only sees and deletes their own rows', async () => {
    const t = convexTest(schema, modules)
    const a = await asUser(t, 'a@example.com')
    const b = await asUser(t, 'b@example.com')

    const incomeId = await a.mutation(api.finance.addIncome, {
      date: '2026-09-01', source: 'upwork', client: 'Harbor', currency: 'USD', gross: 100, net: 90, split: null, note: null,
    })
    await a.mutation(api.finance.addConversion, { date: '2026-09-02', usd: 90, ngn: 135000, fee_ngn: 500, split, note: 'Grey' })
    await a.mutation(api.finance.addExpense, { date: '2026-09-03', amount_ngn: 5000, bucket: 'living', category: 'Food', note: null })
    await a.mutation(api.finance.addReturn, { date: '2026-09-03', amount_ngn: 2000, note: null })
    await a.mutation(api.finance.addMove, { date: '2026-09-03', amount_ngn: 1000, from_bucket: 'living', to_bucket: 'savings', note: null })

    const mine = await a.query(api.finance.all, {})
    expect(mine?.email).toBe('a@example.com')
    expect(mine?.incomes).toHaveLength(1)
    expect(mine?.conversions[0].ngn).toBe(135000)
    expect(mine?.expenses[0].category).toBe('Food')
    expect(mine?.returns).toHaveLength(1)
    expect(mine?.moves).toHaveLength(1)

    const theirs = await b.query(api.finance.all, {})
    expect(theirs?.incomes).toHaveLength(0)
    await expect(b.mutation(api.finance.remove, { table: 'incomes', id: incomeId })).rejects.toThrow()

    await a.mutation(api.finance.remove, { table: 'incomes', id: incomeId })
    expect((await a.query(api.finance.all, {}))?.incomes).toHaveLength(0)
  })

  test('settings upsert and validation', async () => {
    const t = convexTest(schema, modules)
    const a = await asUser(t, 'a@example.com')
    const s = { pct_savings: 30, pct_product: 20, pct_bills: 25, pct_living: 25, product_cap_ngn: 300000 }
    await a.mutation(api.finance.saveSettings, s)
    await a.mutation(api.finance.saveSettings, { ...s, product_cap_ngn: 250000 })
    const res = await a.query(api.finance.all, {})
    expect(res?.settings?.product_cap_ngn).toBe(250000)
    expect(res?.settings?.pct_savings).toBe(30)

    await expect(a.mutation(api.finance.saveSettings, { ...s, pct_living: 40 })).rejects.toThrow(/100%/)
    await expect(a.mutation(api.finance.addIncome, {
      date: '2026-09-01', source: 'fiverr', currency: 'USD', gross: 50, net: 60, split: null,
    })).rejects.toThrow()
    await expect(a.mutation(api.finance.addExpense, {
      date: 'yesterday', amount_ngn: 100, bucket: 'bills', category: 'Rent',
    })).rejects.toThrow(/date/)
  })
})
