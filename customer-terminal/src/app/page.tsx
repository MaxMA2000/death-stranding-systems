import OrderForm from '@/components/OrderForm'
import TerminalHeader from '@/components/TerminalHeader'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-blue-100">
      {/* Terminal Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="grid grid-cols-12 gap-px h-full">
          {Array.from({ length: 144 }).map((_, i) => (
            <div key={i} className="bg-blue-400 opacity-20"></div>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        <TerminalHeader />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Terminal Title */}
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-mono text-blue-300 mb-2 tracking-wider">
                KNOT CITY TERMINAL
              </h1>
              <div className="h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
              <p className="text-blue-200 mt-4 font-mono text-sm">
                BRIDGES DELIVERY NETWORK - AUTHORIZED PERSONNEL ONLY
              </p>
            </div>

            {/* Status Indicators */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-800 border border-blue-500/30 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-mono text-blue-200">NETWORK STATUS</span>
                </div>
                <p className="text-green-400 font-mono text-xs mt-1">ONLINE</p>
              </div>
              
              <div className="bg-gray-800 border border-blue-500/30 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-mono text-blue-200">CHIRAL NETWORK</span>
                </div>
                <p className="text-blue-400 font-mono text-xs mt-1">CONNECTED</p>
              </div>

              <div className="bg-gray-800 border border-blue-500/30 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-mono text-blue-200">PORTER STATUS</span>
                </div>
                <p className="text-yellow-400 font-mono text-xs mt-1">AVAILABLE</p>
              </div>
            </div>

            {/* Main Content */}
            <div className="bg-gray-800/50 border border-blue-500/30 rounded-lg p-6 backdrop-blur-sm">
              <OrderForm />
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-blue-300/60 font-mono text-xs">
                BRIDGES CORPORATION © 2024 - RECONNECTING AMERICA
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
