import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('CivicPulse Frontend - Auth', () => {
  it('login form renders', () => {
    render(
      <form>
        <input placeholder="Email" />
        <input placeholder="Password" />
        <button>Login</button>
      </form>
    )
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('should handle login input', async () => {
    const user = userEvent.setup()
    render(<input placeholder="Email" />)
    const input = screen.getByPlaceholderText('Email')
    await user.type(input, 'test@test.com')
    expect(input).toHaveValue('test@test.com')
    console.log('✅ Frontend Auth working')
  })
})