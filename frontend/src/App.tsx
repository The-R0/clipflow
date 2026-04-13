import { useState } from 'react'
import { MonoTheme }  from './themes/Mono'
import { CrispTheme } from './themes/Crisp'
import { WinUITheme } from './themes/WinUI'

type Theme = 'mono' | 'crisp' | 'winui'
const CYCLE: Theme[] = ['mono', 'crisp', 'winui']

export default function App() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('cf-theme') as Theme) || 'winui'
  )

  const next = () => {
    const n = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]
    setTheme(n)
    localStorage.setItem('cf-theme', n)
  }

  return (
    <div className="w-full h-full bg-transparent">
      {theme === 'mono'  && <MonoTheme  onSwitch={next} />}
      {theme === 'crisp' && <CrispTheme onSwitch={next} />}
      {theme === 'winui' && <WinUITheme onSwitch={next} />}
    </div>
  )
}
