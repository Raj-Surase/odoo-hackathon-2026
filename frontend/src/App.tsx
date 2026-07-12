import { useState } from 'react'
import { CheckCircle2, AlertTriangle, Hammer, ShieldAlert } from 'lucide-react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-primary-bg text-zinc-100 flex flex-col justify-center items-center p-6 selection:bg-accent-available selection:text-primary-bg">
      <div className="max-w-md w-full bg-secondary-bg border border-border-color rounded-2xl p-8 shadow-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            AssetFlow Setup
          </h1>
          <p className="text-zinc-400 text-sm">
            Phase 1: Environment Setup & Infrastructure Complete
          </p>
        </div>

        {/* Status Palette Showcase */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold tracking-wider text-zinc-500 uppercase">
            Color Palette & UI System
          </h2>
          <div className="grid grid-cols-2 gap-3 text-xs font-medium">
            <div className="bg-primary-bg border border-border-color p-4 rounded-xl flex flex-col items-center justify-center space-y-2">
              <span className="text-zinc-400">Available</span>
              <div className="bg-accent-available/20 text-accent-available px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>Active</span>
              </div>
            </div>

            <div className="bg-primary-bg border border-border-color p-4 rounded-xl flex flex-col items-center justify-center space-y-2">
              <span className="text-zinc-400">Overdue</span>
              <div className="bg-alert-overdue/20 text-alert-overdue px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <ShieldAlert size={14} />
                <span>Overdue</span>
              </div>
            </div>

            <div className="bg-primary-bg border border-border-color p-4 rounded-xl flex flex-col items-center justify-center space-y-2 col-span-2">
              <span className="text-zinc-400">Maintenance</span>
              <div className="bg-warning-maintenance/20 text-warning-maintenance px-4 py-1.5 rounded-full flex items-center gap-1.5">
                <Hammer size={14} />
                <span>Under Maintenance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Element */}
        <div className="pt-2 flex flex-col items-center space-y-3">
          <button
            id="test-counter-btn"
            onClick={() => setCount((c) => c + 1)}
            className="w-full bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] border border-zinc-700 text-white font-medium py-3 px-4 rounded-xl transition duration-150 flex items-center justify-center gap-2"
          >
            <AlertTriangle size={16} className="text-warning-maintenance" />
            <span>Interactive Test Counter: {count}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
