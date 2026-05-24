'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin() {
    const res = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.ok) {
      router.push('/')
    } else {
      setError('Грешна парола!')
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh' }}>
      <h1>ЦСОП Деловодство</h1>
      <input
        type="password"
        placeholder="Парола"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={{ padding:'10px', margin:'10px', fontSize:'16px' }}
      />
      <button onClick={handleLogin} style={{ padding:'10px 20px', fontSize:'16px' }}>
        Вход
      </button>
      {error && <p style={{ color:'red' }}>{error}</p>}
    </div>
  )
}
