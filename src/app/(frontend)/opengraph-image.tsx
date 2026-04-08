import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const alt = 'Carryish — Cargo bikes are confusing. We make it simple.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAFAF8',
        }}
      >
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 700 }}>
          <span style={{ color: '#1A1A2E' }}>carry</span>
          <span style={{ color: '#E85D3A' }}>ish</span>
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 28,
            color: '#7A7A8C',
            textAlign: 'center',
            maxWidth: 600,
          }}
        >
          Cargo bikes are confusing. We make it simple.
        </div>
      </div>
    ),
    { ...size },
  )
}
