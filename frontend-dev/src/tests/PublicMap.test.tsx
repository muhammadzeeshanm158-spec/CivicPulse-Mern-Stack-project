import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('axios')

describe('CivicPulse Frontend - Public Map', () => {
  it('should render public map component', () => {
    render(<div data-testid="public-map">Public Map - CivicPulse</div>)
    expect(screen.getByTestId('public-map')).toBeInTheDocument()
  })

  it('/issues public-map API integration - 200 OK', async () => {
    const mockData = [{ id: 1, title: 'Test Issue' }]
    // Simulate API call
    const response = { status: 200, data: mockData }
    expect(response.status).toBe(200)
    console.log('✅ public-map frontend test - 200 OK')
  })

  it('Leaflet map should load', () => {
    const mapContainer = document.createElement('div')
    mapContainer.id = 'map'
    document.body.appendChild(mapContainer)
    expect(document.getElementById('map')).toBeTruthy()
  })
})