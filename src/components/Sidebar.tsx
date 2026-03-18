'use client'
import { FOLDER_ICONS, FOLDER_ORDER } from '@/lib/utils'
import type { ZohoFolder } from '@/types'

interface Props {
  folders:      ZohoFolder[]
  activeFolder: string
  onSelect:     (name: string) => void
}

export default function Sidebar({ folders, activeFolder, onSelect }: Props) {
  const map: Record<string, ZohoFolder> = {}
  folders.forEach(f => { map[f.name] = f })
  const sorted = [
    ...FOLDER_ORDER.filter(n => map[n]).map(n => map[n]),
    ...folders.filter(f => !FOLDER_ORDER.includes(f.name)),
  ]

  return (
    <aside className="h-full flex flex-col bg-zinc-900 border-r border-zinc-800 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-600 px-2 pb-1">
          Folders
        </p>
        {sorted.map(f => {
          const icon  = FOLDER_ICONS[f.name.toLowerCase()] ?? '◇'
          const on    = f.name === activeFolder
          const count = f.unread || 0
          return (
            <button
              key={f.id}
              onClick={() => onSelect(f.name)}
              className={`
                w-full flex items-center gap-2 px-3 py-[7px] rounded-md text-[13px] font-medium
                border mb-px transition-all duration-150 text-left cursor-pointer
                ${on
                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                  : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}
              `}
            >
              <span className="w-4 text-center opacity-70 shrink-0">{icon}</span>
              <span className="flex-1 truncate">{f.name}</span>
              <span className={`
                text-[10px] font-bold px-[6px] py-px rounded-full min-w-[18px] text-center shrink-0
                ${count === 0 ? 'bg-zinc-800 text-zinc-600' : 'bg-indigo-500 text-white'}
              `}>
                {count}
              </span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
