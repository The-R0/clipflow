import { useState } from 'react'
import { MonoTheme }    from './themes/Mono'
import { FluidTheme }   from './themes/Fluid'
import { CrispTheme }   from './themes/Crisp'
import { ClassicTheme } from './themes/Classic'
import { WinUITheme }   from './themes/WinUI'

type Theme = 'mono' | 'fluid' | 'crisp' | 'classic' | 'winui'
const CYCLE: Theme[] = ['mono', 'fluid', 'crisp', 'classic', 'winui']

export default function App() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('cf-theme') as Theme) || 'crisp'
  )

  const next = () => {
    const n = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]
    setTheme(n)
    localStorage.setItem('cf-theme', n)
  }

  return (
    <div className="w-full h-full bg-transparent">
      {theme === 'mono'    && <MonoTheme    onSwitch={next} />}
      {theme === 'fluid'   && <FluidTheme   onSwitch={next} />}
      {theme === 'crisp'   && <CrispTheme   onSwitch={next} />}
      {theme === 'classic' && <ClassicTheme onSwitch={next} />}
      {theme === 'winui'   && <WinUITheme   onSwitch={next} />}
    </div>
  )
}
