import { useMutation, useQuery } from 'convex/react'
import { ConvexError } from 'convex/values'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../../convex/_generated/api'
import { DEFAULT_SETTINGS, type Data, type Settings } from './types'

export type Table = 'incomes' | 'conversions' | 'expenses' | 'product_returns' | 'moves'

type Store = {
  data: Data
  email: string | null
  loading: boolean
  error: string | null
  clearError: () => void
  insert: (table: Table, row: Record<string, unknown>) => Promise<boolean>
  remove: (table: Table, id: string) => Promise<boolean>
  saveSettings: (s: Settings) => Promise<boolean>
}

const EMPTY: Data = { settings: DEFAULT_SETTINGS, incomes: [], conversions: [], expenses: [], returns: [], moves: [] }
const CACHE = 'kobo-cache-v2'

function readCache(): Data | null {
  try {
    const raw = localStorage.getItem(CACHE)
    return raw ? (JSON.parse(raw) as Data) : null
  } catch {
    return null
  }
}

function writeCache(d: Data) {
  try {
    localStorage.setItem(CACHE, JSON.stringify(d))
  } catch {
    /* storage unavailable; the app still works online */
  }
}

export function clearCache() {
  try {
    localStorage.removeItem(CACHE)
  } catch {
    /* ignore */
  }
}

type WithMeta = { _id: string; _creationTime: number; userId?: string }
function rows<T>(docs: WithMeta[]): T[] {
  return docs.map(({ _id, _creationTime, userId: _u, ...rest }) => ({ ...rest, id: _id, created_at: new Date(_creationTime).toISOString() }) as T)
}

function message(e: unknown) {
  if (e instanceof ConvexError) return typeof e.data === 'string' ? e.data : 'Could not save.'
  return navigator.onLine ? 'Could not save. Try again.' : 'You are offline. Nothing was saved, try again when connected.'
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const raw = useQuery(api.finance.all)
  const [cached] = useState(readCache)
  const [error, setError] = useState<string | null>(null)

  const data = useMemo<Data>(() => {
    if (!raw) return cached ?? EMPTY
    const s = raw.settings
    return {
      settings: s
        ? { pct_savings: s.pct_savings, pct_product: s.pct_product, pct_bills: s.pct_bills, pct_living: s.pct_living, product_cap_ngn: s.product_cap_ngn }
        : DEFAULT_SETTINGS,
      incomes: rows(raw.incomes),
      conversions: rows(raw.conversions),
      expenses: rows(raw.expenses),
      returns: rows(raw.returns),
      moves: rows(raw.moves),
    }
  }, [raw, cached])

  useEffect(() => {
    if (raw) writeCache(data)
  }, [raw, data])

  const addIncome = useMutation(api.finance.addIncome)
  const addConversion = useMutation(api.finance.addConversion)
  const addExpense = useMutation(api.finance.addExpense)
  const addReturn = useMutation(api.finance.addReturn)
  const addMove = useMutation(api.finance.addMove)
  const removeRow = useMutation(api.finance.remove)
  const save = useMutation(api.finance.saveSettings)

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      setError(null)
      return true
    } catch (e) {
      setError(message(e))
      return false
    }
  }, [])

  const insert = useCallback(
    (table: Table, row: Record<string, unknown>) =>
      run(() => {
        // row shapes are built by the forms in AddSheet to match each mutation's validator
        const r = row as never
        switch (table) {
          case 'incomes': return addIncome(r)
          case 'conversions': return addConversion(r)
          case 'expenses': return addExpense(r)
          case 'product_returns': return addReturn(r)
          case 'moves': return addMove(r)
        }
      }),
    [run, addIncome, addConversion, addExpense, addReturn, addMove],
  )

  const remove = useCallback((table: Table, id: string) => run(() => removeRow({ table, id })), [run, removeRow])
  const saveSettings = useCallback((s: Settings) => run(() => save(s)), [run, save])

  const value: Store = {
    data,
    email: raw?.email ?? null,
    loading: raw === undefined && !cached,
    error: raw === undefined && cached && !navigator.onLine ? 'Offline. Showing your last saved numbers.' : error,
    clearError: () => setError(null),
    insert,
    remove,
    saveSettings,
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}
