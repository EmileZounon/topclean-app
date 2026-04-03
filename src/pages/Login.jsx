import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Login() {
  const { login, setup, isFirstTime } = useAuth()
  const navigate = useNavigate()

  if (isFirstTime) return <Setup onDone={() => navigate('/', { replace: true })} />
  return <PinLogin onDone={() => navigate('/', { replace: true })} />
}

function Setup({ onDone }) {
  const { setup } = useAuth()
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [role, setRole] = useState('admin')

  function handleSubmit(e) {
    e.preventDefault()
    if (pin.length < 4) return alert('Le code PIN doit avoir au moins 4 chiffres.')
    setup(name.trim(), pin, role)
    onDone()
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">TopClean+</h1>
          <p className="text-slate-500 mt-1">Premiere configuration</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Votre nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="Ex: Patron"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Code PIN (4+ chiffres)</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              required
              maxLength={6}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-center text-2xl tracking-widest"
              placeholder="****"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`flex-1 py-3 rounded-lg font-medium border ${role === 'admin' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300'}`}
              >
                Patron
              </button>
              <button
                type="button"
                onClick={() => setRole('staff')}
                className={`flex-1 py-3 rounded-lg font-medium border ${role === 'staff' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300'}`}
              >
                Personnel
              </button>
            </div>
          </div>

          <button type="submit" className="w-full py-3 bg-primary text-white font-semibold rounded-lg">
            Commencer
          </button>
        </form>
      </div>
    </div>
  )
}

function PinLogin({ onDone }) {
  const { login } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (login(pin)) {
      onDone()
    } else {
      setError('Code PIN incorrect')
      setPin('')
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">TopClean+</h1>
          <p className="text-slate-500 mt-1">Gestion de caisse</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg text-center">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Code PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              required
              maxLength={6}
              autoFocus
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-center text-2xl tracking-widest"
              placeholder="****"
            />
          </div>

          <button type="submit" className="w-full py-3 bg-primary text-white font-semibold rounded-lg">
            Entrer
          </button>
        </form>
      </div>
    </div>
  )
}
