import PorterDashboard from '@/components/PorterDashboard'
import PorterHeader from '@/components/PorterHeader'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-orange-100">
      {/* Terminal Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="grid grid-cols-16 gap-px h-full">
          {Array.from({ length: 256 }).map((_, i) => (
            <div key={i} className="bg-orange-400 opacity-20"></div>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        <PorterHeader />
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Terminal Title */}
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-mono text-orange-300 mb-2 tracking-wider">
                PORTER TERMINAL
              </h1>
              <div className="h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent"></div>
              <p className="text-orange-200 mt-4 font-mono text-sm">
                BRIDGES DELIVERY NETWORK - PORTER INTERFACE
              </p>
            </div>

            {/* Status Indicators */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-800 border border-orange-500/30 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-mono text-orange-200">ODRADEK STATUS</span>
                </div>
                <p className="text-green-400 font-mono text-xs mt-1">ACTIVE</p>
              </div>
              
              <div className="bg-gray-800 border border-orange-500/30 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-mono text-orange-200">CHIRAL NETWORK</span>
                </div>
                <p className="text-blue-400 font-mono text-xs mt-1">CONNECTED</p>
              </div>

              <div className="bg-gray-800 border border-orange-500/30 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-mono text-orange-200">BB STATUS</span>
                </div>
                <p className="text-yellow-400 font-mono text-xs mt-1">STABLE</p>
              </div>

              <div className="bg-gray-800 border border-orange-500/30 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-mono text-orange-200">CARGO LOAD</span>
                </div>
                <p className="text-orange-400 font-mono text-xs mt-1">READY</p>
              </div>
            </div>

            {/* Main Content */}
            <div className="bg-gray-800/50 border border-orange-500/30 rounded-lg p-6 backdrop-blur-sm">
              <PorterDashboard />
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-orange-300/60 font-mono text-xs">
                PORTER UNIT - KEEP ON KEEPING ON
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
