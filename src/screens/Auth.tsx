import { useState } from 'react'
import { Mark } from '../components/Mark'
import { useAuthActions } from '@convex-dev/auth/react'

export function Auth() {
  const { signIn } = useAuthActions()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      await signIn('password', { email: email.trim().toLowerCase(), password, flow: mode === 'in' ? 'signIn' : 'signUp' })
    } catch {
      setBusy(false)
      setMsg({
        text: mode === 'in'
          ? 'Wrong email or password. First time here? Create your account instead.'
          : 'Could not create the account. The email may already be registered, or the password is under 8 characters.',
        bad: true,
      })
    }
  }

  return (
    <main className="auth">
      <Mark className="mark" />
      <h1>Kobo</h1>
      <p className="lede">Every dollar you earn and every naira you spend, in one place only you can see.</p>
      <form className="form" onSubmit={submit}>
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password</span>
          <input className="input" type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {msg && <p className={msg.bad ? 'err' : 'hint'} style={{ margin: 0 }}>{msg.text}</p>}
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create my account'}</button>
        <button type="button" className="link-btn" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setMsg(null) }}>
          {mode === 'in' ? 'First time? Create your account' : 'Already set up? Sign in'}
        </button>
      </form>
    </main>
  )
}
