import { useId } from 'react'

export const parseAmt = (s: string) => {
  const n = Number(s.replace(/,/g, ''))
  return Number.isFinite(n) ? n : 0
}

function format(raw: string, decimals: boolean) {
  let s = raw.replace(/[^\d.]/g, '')
  if (!decimals) s = s.replace(/\./g, '')
  const [int, ...rest] = s.split('.')
  const dec = rest.join('').slice(0, 2)
  const intFmt = int.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return s.includes('.') ? `${intFmt}.${dec}` : intFmt
}

type Props = {
  label: string
  value: string
  onChange: (v: string) => void
  currency: 'USD' | 'NGN'
  autoFocus?: boolean
  big?: boolean
}

export function AmountInput({ label, value, onChange, currency, autoFocus, big }: Props) {
  const id = useId()
  const sym = currency === 'USD' ? '$' : '₦'
  if (!big) {
    return (
      <label className="field" htmlFor={id}>
        <span>{label}</span>
        <input
          id={id}
          className="input num"
          inputMode="decimal"
          placeholder={`${sym}0`}
          value={value ? `${sym}${value}` : ''}
          onChange={(e) => onChange(format(e.target.value, currency === 'USD'))}
        />
      </label>
    )
  }
  return (
    <div className="field">
      <label className="label" htmlFor={id}>{label}</label>
      <div className="amount">
        <span className="amount-cur">{sym}</span>
        <input
          id={id}
          inputMode="decimal"
          placeholder="0"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(format(e.target.value, currency === 'USD'))}
        />
      </div>
    </div>
  )
}

export const toInput = (n: number, currency: 'USD' | 'NGN') =>
  format(currency === 'USD' ? n.toFixed(2) : String(Math.round(n)), currency === 'USD')
