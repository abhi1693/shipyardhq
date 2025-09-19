import type { CSSProperties } from "react"

const waveSvg = `
  <svg xmlns='http://www.w3.org/2000/svg' width='200' height='80' viewBox='0 0 200 80'>
    <path
      d='M0 40 Q 20 20 40 40 T 80 40 T 120 40 T 160 40 T 200 40'
      fill='none'
      stroke='#0A3C6E'
      stroke-opacity='0.12'
      stroke-width='1.5'
      stroke-linecap='round'
    />
    <path
      d='M0 60 Q 20 40 40 60 T 80 60 T 120 60 T 160 60 T 200 60'
      fill='none'
      stroke='#0A3C6E'
      stroke-opacity='0.08'
      stroke-width='1.5'
      stroke-linecap='round'
    />
  </svg>
`

const encodedWaveSvg = encodeURIComponent(waveSvg)

const wavePatternUri = `url("data:image/svg+xml,${encodedWaveSvg}")`

export function getWaveBackground(size = "200px 80px"): CSSProperties {
  return {
    backgroundImage: wavePatternUri,
    backgroundSize: size,
    backgroundRepeat: "repeat",
  }
}
