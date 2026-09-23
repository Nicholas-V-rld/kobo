export const BUCKETS = ['savings', 'product', 'bills', 'living'] as const
export type Bucket = (typeof BUCKETS)[number]
export type Split = Record<Bucket, number>

export const BUCKET_LABEL: Record<Bucket, string> = {
  savings: 'Savings',
  product: 'Product',
  bills: 'Bills',
  living: 'Living',
}

export const BUCKET_HINT: Record<Bucket, string> = {
  savings: 'Do not touch',
  product: 'Network marketing stock',
  bills: 'Responsibilities',
  living: 'Food, transport, fun',
}

export const SOURCES = ['upwork', 'fiverr', 'outreach', 'referral', 'other'] as const
export type Source = (typeof SOURCES)[number]
export const SOURCE_LABEL: Record<Source, string> = {
  upwork: 'Upwork',
  fiverr: 'Fiverr',
  outreach: 'Cold outreach',
  referral: 'Referral',
  other: 'Other',
}

export const CATEGORY_SUGGESTIONS: Record<Bucket, string[]> = {
  product: ['Product order', 'Delivery', 'Business tools'],
  bills: ['Rent', 'Family support', 'Data & airtime', 'Electricity', 'Subscriptions'],
  living: ['Food', 'Transport', 'Outings', 'Clothes', 'Personal care', 'Gifts'],
  savings: ['Emergency', 'Investment'],
}

export type Settings = {
  user_id?: string
  pct_savings: number
  pct_product: number
  pct_bills: number
  pct_living: number
  product_cap_ngn: number
}

export type Income = {
  id: string
  date: string
  source: Source
  client: string | null
  currency: 'USD' | 'NGN'
  gross: number
  net: number
  split: Split | null
  note: string | null
  created_at: string
}

export type Conversion = {
  id: string
  date: string
  usd: number
  ngn: number
  fee_ngn: number
  split: Split
  note: string | null
  created_at: string
}

export type Expense = {
  id: string
  date: string
  amount_ngn: number
  bucket: Bucket
  category: string
  note: string | null
  created_at: string
}

export type ProductReturn = {
  id: string
  date: string
  amount_ngn: number
  note: string | null
  created_at: string
}

export type Move = {
  id: string
  date: string
  from_bucket: Bucket
  to_bucket: Bucket
  amount_ngn: number
  note: string | null
  created_at: string
}

export type Data = {
  settings: Settings
  incomes: Income[]
  conversions: Conversion[]
  expenses: Expense[]
  returns: ProductReturn[]
  moves: Move[]
}

export const DEFAULT_SETTINGS: Settings = {
  pct_savings: 20,
  pct_product: 30,
  pct_bills: 25,
  pct_living: 25,
  product_cap_ngn: 400000,
}

export function splitFromSettings(s: Settings): Split {
  return { savings: s.pct_savings, product: s.pct_product, bills: s.pct_bills, living: s.pct_living }
}
