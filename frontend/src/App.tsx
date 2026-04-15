import { useState } from 'react'
import { WinUITheme } from './themes/WinUI'
import { FluidTheme } from './themes/Fluid'

type Theme = 'winui' | 'fluid'
const CYCLE: Theme[] = ['winui', 'fluid']

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('cf-theme') as Theme
    return CYCLE.includes(stored) ? stored : 'winui'
  })

  const next = () => {
    const n = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]
    setTheme(n)
    localStorage.setItem('cf-theme', n)
  }

  return (
    <div className="w-full h-full bg-transparent">
      {theme === 'winui' && <WinUITheme onSwitch={next} />}
      {theme === 'fluid' && <FluidTheme onSwitch={next} />}
    </div>
  )
}
