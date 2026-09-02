import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../services/api'
import { useAuthStore } from '../store/auth'

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    try {
      const response = await api.post('/auth/login', { email, password })
      const token = response.data.token
      const payload = JSON.parse(atob(token.split('.')[1]))
      login(token, payload.role)
      navigate('/')
    } catch {
      setError('Identifiants incorrects ou API indisponible.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-art">
        <div className="art-grid" />
        <span className="brand-mark large">M</span>
        <p className="art-kicker">SYSTÈME DE GESTION</p>
        <h1>
          Le stock juste.
          <br />
          <em>Chaque jour.</em>
        </h1>
        <p>Une caisse plus fluide, des stocks maîtrisés, une trésorerie lisible.</p>
        <div className="art-stamp">
          MGA
          <br />
          <small>Depuis 2026</small>
        </div>
      </div>

      <div className="login-card">
        <span className="eyebrow">ACCÈS ÉQUIPE</span>
        <h2>
          Bienvenue
          <br />
          <span>au magasin.</span>
        </h2>
        <p className="muted">Connectez-vous pour accéder à votre espace de travail.</p>

        <form onSubmit={submit}>
          <label>
            Email professionnel
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="username"
              required
              placeholder="vous@magasin.mg"
            />
          </label>
          <label>
            Mot de passe
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </label>

          {error && <div className="error-box">{error}</div>}

          <button className="primary wide">
            Ouvrir la session <span>→</span>
          </button>
        </form>

        <small className="muted">Accès sécurisé par authentification JWT</small>
      </div>
    </div>
  )
}
