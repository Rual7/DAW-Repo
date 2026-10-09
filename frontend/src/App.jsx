
import { useEffect, useState } from 'react'
import './App.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function App() {
  const [isRegister, setIsRegister] = useState(false)
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [csrfToken, setCsrfToken] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const emailIsValid = EMAIL_PATTERN.test(email.trim())

  const passwordIsValid =
    password.length >= 8 && password.length <= 72

  const passwordsMatch = password === confirmPassword

  const errors = []

  // Validate only after the user presses Login or Register.
  if (submitted) {
    if (!email.trim()) {
      errors.push({
        field: 'email',
        text: 'Email is required.',
      })
    } else if (!emailIsValid) {
      errors.push({
        field: 'email',
        text: 'Please enter a valid email address.',
      })
    }

    if (!password) {
      errors.push({
        field: 'password',
        text: 'Password is required.',
      })
    } else if (!passwordIsValid) {
      errors.push({
        field: 'password',
        text: 'Password must be between 8 and 72 characters.',
      })
    }

    // Validate confirmation only after the password is valid.
    if (isRegister && passwordIsValid) {
      if (!confirmPassword) {
        errors.push({
          field: 'confirmPassword',
          text: 'Please confirm your password.',
        })
      } else if (!passwordsMatch) {
        errors.push({
          field: 'confirmPassword',
          text: 'Passwords do not match.',
        })
      }
    }
  }

  async function refreshCsrf() {
    const response = await fetch('/api/csrf', {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Unable to initialize security token.')
    }

    const data = await response.json()
    setCsrfToken(data.token)

    return data.token
  }

  useEffect(() => {
    async function initialize() {
      try {
        await refreshCsrf()

        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        })

        if (response.ok) {
          setUser(await response.json())
        }
      } catch {
        setMessage('Unable to connect to the server.')
      } finally {
        setCheckingSession(false)
      }
    }

    initialize()
  }, [])

  function resetForm() {
    setPassword('')
    setConfirmPassword('')
    setSubmitted(false)
    setMessage('')
  }

  function handleFieldChange(setter, value) {
    setter(value)
    setSubmitted(false)
    setMessage('')
  }

  function switchMode() {
    setIsRegister((previous) => !previous)
    resetForm()
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setSubmitted(true)
    setMessage('')

    // Stop submission if required fields are invalid.
    if (
      !emailIsValid ||
      !passwordIsValid ||
      (isRegister && !confirmPassword) ||
      (isRegister && !passwordsMatch)
    ) {
      return
    }

    setLoading(true)

    try {
      const token = csrfToken || await refreshCsrf()

      const response = await fetch(
        isRegister ? '/api/auth/register' : '/api/auth/login',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': token,
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        },
      )

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setMessage(data.message || 'Something went wrong.')
        return
      }

      if (isRegister) {
        setIsRegister(false)
        setPassword('')
        setConfirmPassword('')
        setSubmitted(false)
        setMessage('')
        return
      }

      const meResponse = await fetch('/api/auth/me', {
        credentials: 'include',
      })

      if (!meResponse.ok) {
        setMessage(
          'Login succeeded, but the session could not be loaded.',
        )
        return
      }

      setUser(await meResponse.json())
      setSubmitted(false)
      setMessage('')

      await refreshCsrf()
    } catch {
      setMessage('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    setLoading(true)
    setMessage('')

    try {
      const token = csrfToken || await refreshCsrf()

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-XSRF-TOKEN': token,
        },
      })

      if (!response.ok) {
        setMessage('Unable to log out. Please try again.')
        return
      }

      setUser(null)
      setEmail('')
      resetForm()

      await refreshCsrf()
    } catch {
      setMessage('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return <main className="auth-page" />
  }

  if (user) {
    return (
      <main className="auth-page">
        <section className="auth-card logout-card">
          <button
            className="auth-button"
            type="button"
            onClick={handleLogout}
            disabled={loading}
          >
            {loading ? 'Please wait...' : 'Log out'}
          </button>

          {message && (
            <p className="auth-message">{message}</p>
          )}
        </section>
      </main>
    )
  }

  const emailHasError = errors.some(
    (error) => error.field === 'email',
  )

  const passwordHasError = errors.some(
    (error) => error.field === 'password',
  )

  const confirmHasError = errors.some(
    (error) => error.field === 'confirmPassword',
  )

  return (
    <main className="auth-page">
      <form
        className="auth-card"
        onSubmit={handleSubmit}
        noValidate
      >
        <h1>Welcome back</h1>

        <div className="form-field">
          <label htmlFor="email">Email</label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) =>
              handleFieldChange(setEmail, event.target.value)
            }
            autoComplete="email"
            placeholder="name@example.com"
            className={emailHasError ? 'input-error' : ''}
            aria-invalid={emailHasError}
            required
          />
        </div>

        <div className="form-field">
          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) =>
              handleFieldChange(setPassword, event.target.value)
            }
            autoComplete={
              isRegister ? 'new-password' : 'current-password'
            }
            minLength={8}
            maxLength={72}
            placeholder="Enter your password"
            className={passwordHasError ? 'input-error' : ''}
            aria-invalid={passwordHasError}
            required
          />
        </div>

        {isRegister && (
          <div className="form-field">
            <label htmlFor="confirmPassword">
              Confirm password
            </label>

            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                handleFieldChange(
                  setConfirmPassword,
                  event.target.value,
                )
              }
              autoComplete="new-password"
              placeholder="Confirm your password"
              className={confirmHasError ? 'input-error' : ''}
              aria-invalid={confirmHasError}
              required
            />
          </div>
        )}

        {/* Validation errors appear above the button. */}
        {errors.length > 0 && (
          <div className="validation-summary" role="alert">
            {errors.map((error) => (
              <p key={error.field}>{error.text}</p>
            ))}
          </div>
        )}

        {message && (
          <p className="auth-message" role="alert">
            {message}
          </p>
        )}

        <button
          className="auth-button"
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Please wait...'
            : isRegister
              ? 'Register'
              : 'Login'}
        </button>

        <button
          className="auth-switch"
          type="button"
          onClick={switchMode}
        >
          {isRegister ? 'Back to login' : 'Create account'}
        </button>
      </form>
    </main>
  )
}

export default App