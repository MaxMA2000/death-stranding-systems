'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

declare global {
  interface Window {
    qq: any;
    init?: () => void;
  }
}

interface Order {
  id: string
  sender: {
    name: string
    location: string
    knot_city: string
    coordinates: { lat: number; lng: number }
  }
  recipient: {
    name: string
    location: string
    knot_city: string
    coordinates: { lat: number; lng: number }
  }
  item: {
    name: string
    description: string
    weight: number
    category: string
  }
  pickup_method: string
  payment_info: string
  status: string
  created_at: string
}

interface BTArea {
  id: string
  name: string
  center: { lat: number; lng: number }
  radius: number
  intensity: string
  is_active: boolean
}

interface NavigationMapProps {
  order: Order
  onClose: () => void
}

export default function NavigationMap({ order, onClose }: NavigationMapProps) {
  const t = useTranslations('navigation')
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [btAreas, setBtAreas] = useState<BTArea[]>([])
  const [routeData, setRouteData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 获取BT区域数据
  useEffect(() => {
    const fetchBTAreas = async () => {
      try {
        const response = await fetch('http://localhost:8081/api/bt-areas')
        if (response.ok) {
          const areas = await response.json()
          setBtAreas(areas)
        }
      } catch (error) {
        console.error('Error fetching BT areas:', error)
      }
    }

    fetchBTAreas()
  }, [])

  // 初始化腾讯地图
  useEffect(() => {
    const initMap = () => {
      if (!mapRef.current || !window.qq) return

      // 创建地图实例
      const mapInstance = new window.qq.maps.Map(mapRef.current, {
        center: new window.qq.maps.LatLng(
          (order.sender.coordinates.lat + order.recipient.coordinates.lat) / 2,
          (order.sender.coordinates.lng + order.recipient.coordinates.lng) / 2
        ),
        zoom: 12,
        mapTypeId: window.qq.maps.MapTypeId.ROADMAP
      })

      setMap(mapInstance)
      setIsLoading(false)

      // 添加起点和终点标记
      const startMarker = new window.qq.maps.Marker({
        position: new window.qq.maps.LatLng(
          order.sender.coordinates.lat,
          order.sender.coordinates.lng
        ),
        map: mapInstance,
        title: `起点: ${order.sender.name}`,
        icon: new window.qq.maps.MarkerImage(
          'data:image/svg+xml;base64,' + btoa(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#22C55E" stroke="#fff" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">S</text>
            </svg>
          `),
          new window.qq.maps.Size(32, 32),
          new window.qq.maps.Point(0, 0),
          new window.qq.maps.Point(16, 16)
        )
      })

      const endMarker = new window.qq.maps.Marker({
        position: new window.qq.maps.LatLng(
          order.recipient.coordinates.lat,
          order.recipient.coordinates.lng
        ),
        map: mapInstance,
        title: `终点: ${order.recipient.name}`,
        icon: new window.qq.maps.MarkerImage(
          'data:image/svg+xml;base64,' + btoa(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="#EF4444" stroke="#fff" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">E</text>
            </svg>
          `),
          new window.qq.maps.Size(32, 32),
          new window.qq.maps.Point(0, 0),
          new window.qq.maps.Point(16, 16)
        )
      })

      // 获取路线规划
      calculateRoute(mapInstance)
    }

    // 加载腾讯地图API
    if (!window.qq) {
      const script = document.createElement('script')
      script.src = `https://map.qq.com/api/gljs?v=1.exp&key=KWWBZ-2OOKL-LZZP5-MFARF-7XNZJ-2UFMV&callback=init`
      script.async = true
      
      window.init = initMap
      document.head.appendChild(script)

      return () => {
        document.head.removeChild(script)
        if (window.init) {
          delete window.init
        }
      }
    } else {
      initMap()
    }
  }, [order])

  // 绘制BT区域
  useEffect(() => {
    if (!map || !btAreas.length) return

    btAreas.forEach(area => {
      const circle = new window.qq.maps.Circle({
        center: new window.qq.maps.LatLng(area.center.lat, area.center.lng),
        radius: area.radius,
        map: map,
        strokeColor: getAreaColor(area.intensity),
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: getAreaColor(area.intensity),
        fillOpacity: 0.2
      })

      // 添加区域标签
      const infoWindow = new window.qq.maps.InfoWindow({
        content: `
          <div class="p-2 text-sm">
            <div class="font-bold text-orange-600">${area.name}</div>
            <div class="text-gray-600">${t('threatLevel')}: ${getIntensityText(area.intensity)}</div>
            <div class="text-gray-600">${t('effectRadius')}: ${area.radius}m</div>
          </div>
        `
      })

      // 点击区域显示信息
      window.qq.maps.event.addListener(circle, 'click', () => {
        infoWindow.open(map, new window.qq.maps.LatLng(area.center.lat, area.center.lng))
      })
    })
  }, [map, btAreas])

  const calculateRoute = async (mapInstance: any) => {
    try {
      const response = await fetch('http://localhost:8081/api/navigation/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: order.sender.coordinates,
          to: order.recipient.coordinates,
          avoid_bt: true,
          transport_mode: "walking"
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setRouteData(data)
        
        // 绘制路线
        if (data.route && data.route.points) {
          const path = data.route.points.map((point: any) => 
            new window.qq.maps.LatLng(point.lat, point.lng)
          )

          const polyline = new window.qq.maps.Polyline({
            path: path,
            map: mapInstance,
            strokeColor: '#3B82F6',
            strokeOpacity: 0.8,
            strokeWeight: 4
          })

          // 调整地图视野以包含整个路线
          const bounds = new window.qq.maps.LatLngBounds()
          path.forEach((point: any) => bounds.extend(point))
          mapInstance.fitBounds(bounds)
        }
      }
    } catch (error) {
      console.error('Error calculating route:', error)
    }
  }

  const getAreaColor = (intensity: string) => {
    switch (intensity) {
      case 'high': return '#EF4444' // 红色 - 高危险
      case 'medium': return '#F59E0B' // 橙色 - 中等危险
      case 'low': return '#EAB308' // 黄色 - 低危险
      case 'timefall': return '#8B5CF6' // 紫色 - 时间雨
      default: return '#6B7280' // 灰色 - 未知
    }
  }

  const getIntensityText = (intensity: string) => {
    switch (intensity) {
      case 'high': return t('highDanger')
      case 'medium': return t('mediumDanger')
      case 'low': return t('lowDanger')
      case 'timefall': return t('timefallZone')
      default: return t('unknown')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-orange-500/30 rounded-lg w-[90vw] h-[80vh] max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-orange-500/30">
          <div>
            <h3 className="text-xl font-mono text-orange-300">{t('title')}</h3>
            <p className="text-orange-400/80 text-sm mt-1">
              {order.sender.name} → {order.recipient.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-orange-300 rounded font-mono transition-colors"
          >
            {t('close')}
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
              <div className="text-orange-300 font-mono">{t('loadingMap')}</div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Route Info */}
        {routeData && (
          <div className="p-4 border-t border-orange-500/30 bg-gray-800/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-mono">
              <div>
                <div className="text-orange-400">{t('distance')}</div>
                <div className="text-orange-200">{routeData.route_info?.total_distance || 'N/A'}</div>
              </div>
              <div>
                <div className="text-orange-400">{t('estimatedTime')}</div>
                <div className="text-orange-200">{routeData.route_info?.estimated_time || 'N/A'}</div>
              </div>
              <div>
                <div className="text-orange-400">{t('dangerLevel')}</div>
                <div className="text-orange-200">{routeData.route_info?.danger_level || 'N/A'}</div>
              </div>
              <div>
                <div className="text-orange-400">{t('btAreas')}</div>
                <div className="text-orange-200">{routeData.bt_areas?.length || 0} 个</div>
              </div>
            </div>
            
            {routeData.warnings && routeData.warnings.length > 0 && (
              <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded">
                <div className="text-yellow-400 font-bold text-xs mb-1">⚠️ {t('routeWarnings')}</div>
                {routeData.warnings.map((warning: string, index: number) => (
                  <div key={index} className="text-yellow-300 text-xs">{warning}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 