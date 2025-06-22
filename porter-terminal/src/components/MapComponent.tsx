'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'

// Tencent Maps types
declare global {
  interface Window {
    qq: any
    TMap: any
  }
}

interface Coordinates {
  lat: number
  lng: number
}

interface BTArea {
  id: string
  name: string
  center: Coordinates
  radius: number
  intensity: string
  isActive: boolean
}

interface Route {
  id: string
  points: Coordinates[]
  distance: number
  duration: number
  btAreas: BTArea[]
  checkpoints: any[]
}

interface NavigationRequest {
  from: Coordinates
  to: Coordinates
  avoidBT: boolean
  cargoWeight: number
  equipment: string[]
}

interface MapComponentProps {
  selectedOrder?: any
  porterLocation?: Coordinates
  onLocationUpdate?: (location: Coordinates) => void
}

export default function MapComponent({ selectedOrder, porterLocation, onLocationUpdate }: MapComponentProps) {
  const t = useTranslations('map')
  const mapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dsMapRef = useRef<HTMLImageElement>(null)
  const [map, setMap] = useState<any>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [btAreas, setBTAreas] = useState<BTArea[]>([])
  const [isNavigating, setIsNavigating] = useState(false)
  const [routeWarnings, setRouteWarnings] = useState<string[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)

  // Initialize Tencent Maps
  useEffect(() => {
    const script = document.createElement('script')
    script.src = `https://map.qq.com/api/gljs?v=1.exp&key=KWWBZ-2OOKL-LZZP5-MFARF-7XNZJ-2UFMV`
    script.async = true
    
    script.onload = () => {
      if (mapRef.current && window.TMap) {
        const mapInstance = new window.TMap.Map(mapRef.current, {
          center: new window.TMap.LatLng(39.9042, 116.4074), // Beijing center
          zoom: 11,
          mapTypeId: 'satellite', // Use satellite view for more immersive feel
          pitch: 45, // 3D perspective
          rotation: 0
        })
        
        setMap(mapInstance)
        setMapLoaded(true)
        
        // Add click listener for location updates
        mapInstance.on('click', (evt: any) => {
          const latLng = evt.latLng
          if (onLocationUpdate) {
            onLocationUpdate({ lat: latLng.lat, lng: latLng.lng })
          }
        })
      }
    }
    
    document.head.appendChild(script)
    
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [onLocationUpdate])

  // Fetch BT areas
  const fetchBTAreas = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:8081/api/bt-areas')
      if (response.ok) {
        const areas = await response.json()
        setBTAreas(areas)
      }
    } catch (error) {
      console.error('Error fetching BT areas:', error)
    }
  }, [])

  // Calculate navigation route
  const calculateRoute = useCallback(async (from: Coordinates, to: Coordinates) => {
    if (!from || !to) return

    setIsNavigating(true)
    setRouteWarnings([])

    try {
      const navigationRequest: NavigationRequest = {
        from,
        to,
        avoidBT: true,
        cargoWeight: selectedOrder?.item?.weight || 10,
        equipment: ['standard']
      }

      const response = await fetch('http://localhost:8081/api/navigation/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(navigationRequest)
      })

      if (response.ok) {
        const navResponse = await response.json()
        setRoute(navResponse.route)
        setRouteWarnings(navResponse.warnings || [])
        setBTAreas(navResponse.btAreas || [])
      }
    } catch (error) {
      console.error('Error calculating route:', error)
      setRouteWarnings(['Failed to calculate route. Using fallback navigation.'])
    } finally {
      setIsNavigating(false)
    }
  }, [selectedOrder])

  // Draw Death Stranding overlay on canvas
  const drawDSOverlay = useCallback(() => {
    const canvas = canvasRef.current
    const dsMap = dsMapRef.current
    if (!canvas || !dsMap || !mapLoaded) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match map container
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw Death Stranding map with transparency
    ctx.globalAlpha = 0.3
    ctx.drawImage(dsMap, 0, 0, canvas.width, canvas.height)
    ctx.globalAlpha = 1.0

    // Draw BT areas
    btAreas.forEach(area => {
      if (!area.isActive) return

      // Convert coordinates to canvas position (simplified)
      const x = (area.center.lng - 116.3) * canvas.width / 0.3
      const y = (39.95 - area.center.lat) * canvas.height / 0.15

      // Draw BT area circle
      ctx.beginPath()
      ctx.arc(x, y, area.radius / 100, 0, 2 * Math.PI)
      
      // Color based on intensity
      let color = 'rgba(255, 0, 0, 0.3)'
      switch (area.intensity) {
        case 'low':
          color = 'rgba(255, 255, 0, 0.3)'
          break
        case 'medium':
          color = 'rgba(255, 165, 0, 0.3)'
          break
        case 'high':
          color = 'rgba(255, 0, 0, 0.3)'
          break
        case 'timefall':
          color = 'rgba(128, 0, 128, 0.5)'
          break
      }
      
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = color.replace('0.3', '0.8').replace('0.5', '1.0')
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw BT area label
      ctx.fillStyle = '#ff6b6b'
      ctx.font = '12px monospace'
      ctx.fillText(area.name, x + 20, y - 10)
    })

    // Draw route if available
    if (route && route.points.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = '#00ff88'
      ctx.lineWidth = 3
      ctx.setLineDash([5, 5])

      route.points.forEach((point, index) => {
        const x = (point.lng - 116.3) * canvas.width / 0.3
        const y = (39.95 - point.lat) * canvas.height / 0.15

        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Draw porter location
    if (porterLocation) {
      const x = (porterLocation.lng - 116.3) * canvas.width / 0.3
      const y = (39.95 - porterLocation.lat) * canvas.height / 0.15

      // Porter marker
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, 2 * Math.PI)
      ctx.fillStyle = '#ff8c00'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      // Porter label
      ctx.fillStyle = '#ffffff'
      ctx.font = '14px monospace'
      ctx.fillText('Sam Porter', x + 15, y - 10)
    }
  }, [btAreas, route, porterLocation, mapLoaded])

  // Update canvas when data changes
  useEffect(() => {
    drawDSOverlay()
  }, [drawDSOverlay])

  // Calculate route when order is selected
  useEffect(() => {
    if (selectedOrder && porterLocation) {
      calculateRoute(porterLocation, selectedOrder.recipient.coordinates)
    }
  }, [selectedOrder, porterLocation, calculateRoute])

  // Fetch BT areas on mount
  useEffect(() => {
    fetchBTAreas()
    const interval = setInterval(fetchBTAreas, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [fetchBTAreas])

  // Simulate new BT areas (for demo)
  const simulateNewBTArea = useCallback(() => {
    const newArea: BTArea = {
      id: `temp-${Date.now()}`,
      name: `Temporal BT-${Math.floor(Math.random() * 1000)}`,
      center: {
        lat: 39.9042 + (Math.random() - 0.5) * 0.1,
        lng: 116.4074 + (Math.random() - 0.5) * 0.1
      },
      radius: 500 + Math.random() * 1500,
      intensity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      isActive: true
    }

    setBTAreas(prev => [...prev, newArea])

    // Remove after 5 minutes
    setTimeout(() => {
      setBTAreas(prev => prev.filter(area => area.id !== newArea.id))
    }, 5 * 60 * 1000)
  }, [])

  return (
    <div className="relative h-full bg-gray-900 border border-orange-500/30 rounded-lg overflow-hidden">
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-20 space-y-2">
        <div className="bg-gray-800/90 border border-orange-500/30 rounded p-3">
          <h3 className="text-orange-300 font-mono text-sm mb-2">{t('navigation')}</h3>
          
          {selectedOrder && (
            <div className="space-y-1 text-xs">
              <div className="text-orange-400">
                {t('destination')}: {selectedOrder.recipient.knotCity}
              </div>
              {route && (
                <div className="text-green-400">
                  {t('distance')}: {(route.distance / 1000).toFixed(1)}km
                </div>
              )}
              {isNavigating && (
                <div className="text-yellow-400 animate-pulse">
                  {t('calculating')}...
                </div>
              )}
            </div>
          )}
          
          <button
            onClick={simulateNewBTArea}
            className="mt-2 px-2 py-1 bg-red-600/20 border border-red-500/50 text-red-300 font-mono text-xs rounded hover:bg-red-600/30 transition-colors"
          >
            {t('simulateBT')}
          </button>
        </div>

        {/* Warnings */}
        {routeWarnings.length > 0 && (
          <div className="bg-red-900/50 border border-red-500/50 rounded p-2 max-w-xs">
            <h4 className="text-red-300 font-mono text-xs mb-1">{t('warnings')}:</h4>
            {routeWarnings.map((warning, index) => (
              <div key={index} className="text-red-200 font-mono text-xs">
                • {warning}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BT Areas Legend */}
      <div className="absolute top-4 right-4 z-20">
        <div className="bg-gray-800/90 border border-orange-500/30 rounded p-3">
          <h3 className="text-orange-300 font-mono text-sm mb-2">{t('btAreas')}</h3>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400/50 border border-yellow-400"></div>
              <span className="text-yellow-300">{t('lowRisk')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-400/50 border border-orange-400"></div>
              <span className="text-orange-300">{t('mediumRisk')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-400/50 border border-red-400"></div>
              <span className="text-red-300">{t('highRisk')}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-purple-400/50 border border-purple-400"></div>
              <span className="text-purple-300">{t('timefall')}</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-orange-400/60">
            {t('activeBTAreas', { count: btAreas.filter(area => area.isActive).length })}
          </div>
        </div>
      </div>

      {/* Tencent Map Container */}
      <div ref={mapRef} className="absolute inset-0 z-10" />
      
      {/* Death Stranding Overlay Canvas */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-15 pointer-events-none"
        style={{ mixBlendMode: 'multiply' }}
      />

      {/* Hidden Death Stranding Map Image */}
      <img
        ref={dsMapRef}
        src="/assets/ds-map.jpeg"
        alt="Death Stranding Map"
        className="hidden"
        crossOrigin="anonymous"
      />

      {/* Loading Overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 z-30 bg-gray-900 flex items-center justify-center">
          <div className="text-orange-300 font-mono text-center">
            <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <div>{t('loadingMap')}...</div>
          </div>
        </div>
      )}
    </div>
  )
} 