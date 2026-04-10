import React, { useState, useEffect, useRef } from 'react'
import { ClipItem, extractVars, fillVars } from '../hooks/useClipflow'
import { PasteText, HidePanel } from '../../wailsjs/go/main/App'

type Props = {
  item: ClipItem
  onDone: () => void
  accentColor?: string
  bgColor?: string
  textColor?: string
  mutedColor?: string
  borderColor?: string
}

export function PromptFillModal({
  item, onDone,
  accentColor = '#E879F9',
  bgColor = '#141414',
  textColor = '#F0F0F0',
  mutedColor = '#888',
  borderColor = '#333',
}: Props) {
  const vars = extractVars(item.content)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    vars.forEach(v => { init[v] = '' })
    return init
  })
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => { firstRef.current?.focus() }, [])

  const filled = fillVars(item.content, values)
  const allFilled = vars.every(v => values[v]?.trim())

  const handlePaste = () => {
    PasteText(filled)
    HidePanel()
    onDone()
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center"
         style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
         onClick={e => { if (e.target === e.currentTarget) onDone() }}>
      <div className="w-[90%] max-w-[260px] rounded-lg p-3 flex flex-col gap-2.5"
           style={{ background: bgColor, border: `1px solid ${borderColor}`, color: textColor }}>

        {/* Title */}
        <div className="text-[11px] font-medium" style={{ color: accentColor }}>
          ✦ {item.preview}
        </div>

        {/* Variable inputs */}
        {vars.map((v, i) => (
          <div key={v}>
            <label className="text-[9px] block mb-0.5" style={{ color: mutedColor }}>
              {`{{${v}}}`}
            </label>
            <input
              ref={i === 0 ? firstRef : undefined}
              value={values[v]}
              onChange={e => setValues(p => ({ ...p, [v]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter' && allFilled) handlePaste() }}
              placeholder={v}
              className="w-full rounded px-2 py-1.5 text-[11px] outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${borderColor}`,
                color: textColor,
              }}
            />
          </div>
        ))}

        {/* Preview */}
        <pre className="text-[9px] whitespace-pre-wrap leading-relaxed max-h-[60px] overflow-y-auto rounded p-2"
             style={{ color: mutedColor, background: 'rgba(0,0,0,0.3)' }}>
          {filled}
        </pre>

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onDone}
            className="flex-1 py-1.5 rounded text-[10px] transition-colors"
            style={{ border: `1px solid ${borderColor}`, color: mutedColor }}>
            取消
          </button>
          <button onClick={handlePaste} disabled={!allFilled}
            className="flex-1 py-1.5 rounded text-[10px] font-medium transition-colors"
            style={{
              background: allFilled ? accentColor : 'rgba(255,255,255,0.05)',
              color: allFilled ? '#000' : mutedColor,
              opacity: allFilled ? 1 : 0.5,
            }}>
            粘贴 ✓
          </button>
        </div>
      </div>
    </div>
  )
}
