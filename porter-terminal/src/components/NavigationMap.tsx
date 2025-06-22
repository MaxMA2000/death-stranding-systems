'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

declare global {
  interface Window {
    qq: any
    TMap: any
  }
}

interface NavigationMapProps {
  fromAddress: string
  fromCoords: [number, number]
  toAddress: string
  toCoords: [number, number]
}

interface BTArea {
  lat: number
  lng: number
  radius: number
  intensity: 'high' | 'medium' | 'low' | 'timefall'
}

// BT危险区域数据 (洛杉矶地区)
const BT_AREAS: BTArea[] = [
  // 高危险区域 (红色)
  { lat: 34.0522, lng: -118.2437, radius: 2000, intensity: 'high' }, // Downtown LA
  { lat: 34.0928, lng: -118.3287, radius: 1500, intensity: 'high' }, // Hollywood
  
  // 中等危险区域 (橙色)
  { lat: 34.0195, lng: -118.4912, radius: 1800, intensity: 'medium' }, // Santa Monica
  { lat: 34.1478, lng: -118.1445, radius: 1200, intensity: 'medium' }, // Pasadena
  
  // 低危险区域 (黄色)
  { lat: 34.0689, lng: -118.4452, radius: 1000, intensity: 'low' }, // Beverly Hills
  { lat: 33.7701, lng: -118.1937, radius: 1500, intensity: 'low' }, // Long Beach
  
  // 时间雨区域 (紫色)
  { lat: 34.1184, lng: -118.3004, radius: 2500, intensity: 'timefall' }, // Universal City
]

// polyline坐标解压函数
function decompressPolyline(polyline: number[]): Array<[number, number]> {
  const coordinates: Array<[number, number]> = []
  
  for (let i = 0; i < polyline.length; i += 2) {
    if (i === 0) {
      // 第一个坐标是原始未压缩的
      coordinates.push([polyline[i], polyline[i + 1]])
    } else {
      // 后续坐标使用前向差分解压
      const lat = polyline[i - 2] + polyline[i] / 1000000
      const lng = polyline[i - 1] + polyline[i + 1] / 1000000
      coordinates.push([lat, lng])
    }
  }
  
  return coordinates
}

export default function NavigationMap({ fromAddress, fromCoords, toAddress, toCoords }: NavigationMapProps) {
  const t = useTranslations('navigation')
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [routeData, setRouteData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 获取BT强度文本
  const getIntensityText = (intensity: string) => {
    switch (intensity) {
      case 'high': return t('btIntensity.high')
      case 'medium': return t('btIntensity.medium')
      case 'low': return t('btIntensity.low')
      case 'timefall': return t('btIntensity.timefall')
      default: return intensity
    }
  }

  // 获取BT区域颜色
  const getBTColor = (intensity: string) => {
    switch (intensity) {
      case 'high': return '#FF0000'      // 红色
      case 'medium': return '#FF8C00'    // 橙色
      case 'low': return '#FFD700'       // 黄色
      case 'timefall': return '#8A2BE2'  // 紫色
      default: return '#808080'
    }
  }

  // 调用腾讯地图路线规划API
  const fetchRoute = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use backend API instead of calling Tencent Maps directly to avoid CORS
      const backendUrl = 'http://localhost:8081'
      const url = `${backendUrl}/api/navigation/route?from_lat=${fromCoords[0]}&from_lng=${fromCoords[1]}&to_lat=${toCoords[0]}&to_lng=${toCoords[1]}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // The backend returns NavigationResponse format, not Tencent format
      if (data.route && data.route.points) {
        // Convert backend response to expected format
        const routeData = {
          distance: data.route.distance,
          duration: data.route.duration,
          polyline: data.route.points // This is already decoded coordinates
        }
        setRouteData(routeData)
      } else {
        throw new Error(t('routeError'))
      }
    } catch (err) {
      console.error('Route planning error:', err)
      setError(err instanceof Error ? err.message : t('routeError'))
    } finally {
      setLoading(false)
    }
  }

  // 初始化地图
  useEffect(() => {
    if (!mapRef.current) return

    const initMap = () => {
      if (!window.qq || !window.qq.maps) {
        setTimeout(initMap, 100)
        return
      }

      const mapInstance = new window.qq.maps.Map(mapRef.current, {
        center: new window.qq.maps.LatLng(fromCoords[0], fromCoords[1]),
        zoom: 12
      })

      setMap(mapInstance)
    }

    initMap()
  }, [fromCoords])

  // 获取路线数据
  useEffect(() => {
    fetchRoute()
  }, [fromCoords, toCoords])

  // 绘制地图内容
  useEffect(() => {
    if (!map || !routeData) return

    // 清除之前的标记
    map.clearOverlays()

    try {
      // Handle route coordinates - backend already provides decoded coordinates
      let routeCoords
      if (Array.isArray(routeData.polyline)) {
        // Backend returns decoded coordinates as an array
        routeCoords = routeData.polyline
      } else if (typeof routeData.polyline === 'string') {
        // Fallback for compressed polyline format
        routeCoords = decompressPolyline(routeData.polyline)
      } else {
        throw new Error('Invalid route data format')
      }
      
      // 创建路线
      const routePath = routeCoords.map((coord: any) => 
        new window.qq.maps.LatLng(coord.lat || coord[0], coord.lng || coord[1])
      )

      const polyline = new window.qq.maps.Polyline({
        path: routePath,
        strokeColor: '#0066CC',
        strokeWeight: 6,
        strokeOpacity: 0.8,
        map: map
      })

      // 添加起点标记
      const startMarker = new window.qq.maps.Marker({
        position: new window.qq.maps.LatLng(fromCoords[0], fromCoords[1]),
        map: map,
        title: t('startPoint')
      })

      const startInfoWindow = new window.qq.maps.InfoWindow({
        content: `<div style="padding: 10px;">
          <h4>${t('startPoint')}</h4>
          <p>${fromAddress}</p>
        </div>`
      })

      window.qq.maps.event.addListener(startMarker, 'click', () => {
        startInfoWindow.open(map, startMarker)
      })

      // 添加终点标记
      const endMarker = new window.qq.maps.Marker({
        position: new window.qq.maps.LatLng(toCoords[0], toCoords[1]),
        map: map,
        title: t('endPoint')
      })

      const endInfoWindow = new window.qq.maps.InfoWindow({
        content: `<div style="padding: 10px;">
          <h4>${t('endPoint')}</h4>
          <p>${toAddress}</p>
        </div>`
      })

      window.qq.maps.event.addListener(endMarker, 'click', () => {
        endInfoWindow.open(map, endMarker)
      })

      // 添加BT危险区域
      BT_AREAS.forEach((area, index) => {
        const circle = new window.qq.maps.Circle({
          center: new window.qq.maps.LatLng(area.lat, area.lng),
          radius: area.radius,
          fillColor: getBTColor(area.intensity),
          fillOpacity: 0.3,
          strokeColor: getBTColor(area.intensity),
          strokeWeight: 2,
          strokeOpacity: 0.8,
          map: map
        })

        const btInfoWindow = new window.qq.maps.InfoWindow({
          content: `<div style="padding: 10px;">
            <h4>${t('btArea')}</h4>
            <p><strong>${t('intensity')}:</strong> ${getIntensityText(area.intensity)}</p>
            <p><strong>${t('radius')}:</strong> ${area.radius}m</p>
            <p style="color: #ff6b35; font-weight: bold;">${t('avoidanceRecommended')}</p>
          </div>`
        })

        window.qq.maps.event.addListener(circle, 'click', (e: any) => {
          btInfoWindow.setPosition(e.latLng)
          btInfoWindow.open(map)
        })
      })

      // 调整地图视野以包含所有点
      const bounds = new window.qq.maps.LatLngBounds()
      bounds.extend(new window.qq.maps.LatLng(fromCoords[0], fromCoords[1]))
      bounds.extend(new window.qq.maps.LatLng(toCoords[0], toCoords[1]))
      
      // 包含BT区域
      BT_AREAS.forEach(area => {
        bounds.extend(new window.qq.maps.LatLng(area.lat, area.lng))
      })
      
      map.fitBounds(bounds)

    } catch (err) {
      console.error('Error rendering map:', err)
      setError(t('mapRenderError'))
    }
  }, [map, routeData, fromCoords, toCoords, fromAddress, toAddress, t])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loadingRoute')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-2">⚠️</div>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchRoute}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 路线信息 */}
      {routeData && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">{t('routeInfo')}</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">{t('distance')}:</span>
              <span className="ml-2 font-medium">{(routeData.distance / 1000).toFixed(1)} km</span>
            </div>
            <div>
              <span className="text-gray-600">{t('duration')}:</span>
              <span className="ml-2 font-medium">{Math.round(routeData.duration / 60)} {t('minutes')}</span>
            </div>
            <div>
              <span className="text-gray-600">{t('toll')}:</span>
              <span className="ml-2 font-medium">¥{routeData.toll || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">{t('trafficLights')}:</span>
              <span className="ml-2 font-medium">{routeData.traffic_light_count || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* BT区域图例 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-3">{t('btLegend')}</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
            <span>{getIntensityText('high')}</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-orange-500 mr-2"></div>
            <span>{getIntensityText('medium')}</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
            <span>{getIntensityText('low')}</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-purple-500 mr-2"></div>
            <span>{getIntensityText('timefall')}</span>
          </div>
        </div>
      </div>

      {/* 地图容器 */}
      <div 
        ref={mapRef} 
        className="w-full h-96 rounded-lg border border-gray-300"
        style={{ minHeight: '400px' }}
      />
    </div>
  )
} 