'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'

// 直接使用静态路径
const DS_MAP_PATH = '/assets/ds-map.jpeg'

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

// BT危险区域数据 - 现在使用地图坐标系统
const BT_AREAS: BTArea[] = [
  // 高危险区域 (红色)
  { lat: 0.2, lng: 0.15, radius: 0.05, intensity: 'high' }, // 左上角
  { lat: 0.8, lng: 0.2, radius: 0.07, intensity: 'high' },  // 右上角
  
  // 中等危险区域 (橙色)
  { lat: 0.3, lng: 0.5, radius: 0.06, intensity: 'medium' }, // 中部
  { lat: 0.7, lng: 0.7, radius: 0.08, intensity: 'medium' }, // 右下角
  
  // 低危险区域 (黄色)
  { lat: 0.4, lng: 0.3, radius: 0.04, intensity: 'low' },    // 中上部
  { lat: 0.6, lng: 0.4, radius: 0.05, intensity: 'low' },    // 中右部
  
  // 时间雨区域 (紫色)
  { lat: 0.5, lng: 0.6, radius: 0.1, intensity: 'timefall' }, // 中下部
]

// 模拟配送站点数据 - 对应地图上的蓝色小房子图标
const DELIVERY_STATIONS = [
  { id: 'capital-knot', name: 'Capital Knot City', lat: 0.15, lng: 0.15 },
  { id: 'port-knot', name: 'Port Knot City', lat: 0.85, lng: 0.2 },
  { id: 'lake-knot', name: 'Lake Knot City', lat: 0.2, lng: 0.8 },
  { id: 'south-knot', name: 'South Knot City', lat: 0.8, lng: 0.85 },
  { id: 'distro-center-1', name: 'Distribution Center West', lat: 0.3, lng: 0.3 },
  { id: 'distro-center-2', name: 'Distribution Center East', lat: 0.7, lng: 0.3 },
  { id: 'waystation-1', name: 'Waystation North', lat: 0.4, lng: 0.2 },
  { id: 'waystation-2', name: 'Waystation South', lat: 0.6, lng: 0.8 },
  { id: 'engineer', name: 'Engineer', lat: 0.35, lng: 0.6 },
  { id: 'craftsman', name: 'Craftsman', lat: 0.65, lng: 0.6 },
  { id: 'elder', name: 'Elder', lat: 0.25, lng: 0.5 },
  { id: 'doctor', name: 'Doctor', lat: 0.75, lng: 0.5 },
]

// 将经纬度坐标转换为画布坐标
const coordsToCanvas = (
  lat: number, 
  lng: number, 
  canvasWidth: number, 
  canvasHeight: number
): [number, number] => {
  // 简单的线性映射，实际项目可能需要更复杂的投影
  const x = lng * canvasWidth
  const y = lat * canvasHeight
  return [x, y]
}

// 生成贝塞尔曲线路径点
const generatePathPoints = (
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  canvasWidth: number,
  canvasHeight: number,
  pointCount = 50
): Array<[number, number]> => {
  const points: Array<[number, number]> = []
  
  // 计算控制点（使路径有弯曲）
  const midLat = (fromLat + toLat) / 2
  const midLng = (fromLng + toLng) / 2
  
  // 添加一些随机偏移使路径看起来更自然
  const offsetLat = (Math.random() - 0.5) * 0.2
  const offsetLng = (Math.random() - 0.5) * 0.2
  
  const cp1Lat = midLat + offsetLat
  const cp1Lng = fromLng + (midLng - fromLng) * 0.5
  
  const cp2Lat = midLat - offsetLat
  const cp2Lng = toLng - (toLng - midLng) * 0.5
  
  // 生成贝塞尔曲线上的点
  for (let i = 0; i <= pointCount; i++) {
    const t = i / pointCount
    
    // 三次贝塞尔曲线公式
    const lat = Math.pow(1-t, 3) * fromLat + 
               3 * Math.pow(1-t, 2) * t * cp1Lat + 
               3 * (1-t) * Math.pow(t, 2) * cp2Lat + 
               Math.pow(t, 3) * toLat
               
    const lng = Math.pow(1-t, 3) * fromLng + 
               3 * Math.pow(1-t, 2) * t * cp1Lng + 
               3 * (1-t) * Math.pow(t, 2) * cp2Lng + 
               Math.pow(t, 3) * toLng
    
    const [x, y] = coordsToCanvas(lat, lng, canvasWidth, canvasHeight)
    points.push([x, y])
  }
  
  return points
}

// 模拟路线数据生成
const generateRouteData = (
  fromLat: number, 
  fromLng: number, 
  toLat: number, 
  toLng: number
) => {
  // 计算直线距离（简化）
  const dx = toLat - fromLat
  const dy = toLng - fromLng
  const distance = Math.sqrt(dx * dx + dy * dy) * 10000 // 模拟米数
  
  // 假设平均速度为5km/h，计算时间（分钟）
  const duration = (distance / 1000) / 5 * 60
  
  return {
    distance: Math.round(distance),
    duration: Math.round(duration),
    points: [] // 这里会在Canvas中生成
  }
}

export default function NavigationMap({ 
  fromAddress, 
  fromCoords, 
  toAddress, 
  toCoords 
}: NavigationMapProps) {
  const t = useTranslations('navigation')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [routeData, setRouteData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 800 })
  
  // 将API坐标转换为我们的地图坐标系统
  const normalizeCoords = (coords: [number, number]): [number, number] => {
    // 假设API坐标是经纬度，我们需要将其映射到0-1范围内
    // 这里使用简单的线性映射，实际项目可能需要更精确的转换
    const normalizedLat = (coords[0] - 30) / 10 // 假设经度范围是30-40
    const normalizedLng = (coords[1] + 120) / 10 // 假设纬度范围是-120--110
    
    // 确保值在0-1范围内
    return [
      Math.max(0, Math.min(1, normalizedLat)),
      Math.max(0, Math.min(1, normalizedLng))
    ]
  }

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
      case 'high': return 'rgba(255, 0, 0, 0.3)'      // 红色半透明
      case 'medium': return 'rgba(255, 140, 0, 0.3)'  // 橙色半透明
      case 'low': return 'rgba(255, 215, 0, 0.3)'     // 黄色半透明
      case 'timefall': return 'rgba(138, 43, 226, 0.3)' // 紫色半透明
      default: return 'rgba(128, 128, 128, 0.3)'
    }
  }
  
  // 获取BT区域边框颜色
  const getBTBorderColor = (intensity: string) => {
    switch (intensity) {
      case 'high': return '#FF0000'      // 红色
      case 'medium': return '#FF8C00'    // 橙色
      case 'low': return '#FFD700'       // 黄色
      case 'timefall': return '#8A2BE2'  // 紫色
      default: return '#808080'
    }
  }

  // 计算路线数据
  const calculateRoute = () => {
    try {
      setLoading(true)
      setError(null)
      
      // 将API坐标转换为我们的地图坐标系统
      const normalizedFrom = normalizeCoords(fromCoords)
      const normalizedTo = normalizeCoords(toCoords)
      
      // 生成模拟路线数据
      const data = generateRouteData(
        normalizedFrom[0], 
        normalizedFrom[1], 
        normalizedTo[0], 
        normalizedTo[1]
      )
      
      setRouteData(data)
    } catch (err) {
      console.error('Route calculation error:', err)
      setError(err instanceof Error ? err.message : t('routeError'))
    } finally {
      setLoading(false)
    }
  }

  // 初始化
  useEffect(() => {
    calculateRoute()
    
    // 设置Canvas大小
    const updateCanvasSize = () => {
      const container = canvasRef.current?.parentElement
      if (container) {
        const { width, height } = container.getBoundingClientRect()
        setCanvasSize({ 
          width: Math.min(width, 800), 
          height: Math.min(width, 800) // 保持正方形
        })
      }
    }
    
    updateCanvasSize()
    window.addEventListener('resize', updateCanvasSize)
    
    return () => {
      window.removeEventListener('resize', updateCanvasSize)
    }
  }, [fromCoords, toCoords])

  // 绘制地图
  useEffect(() => {
    if (!canvasRef.current || !routeData) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 加载地图图片
    const img = document.createElement('img') as HTMLImageElement
    img.src = DS_MAP_PATH
    img.onload = () => {
      // 绘制地图背景
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      // 绘制BT区域
      BT_AREAS.forEach(area => {
        const [x, y] = coordsToCanvas(area.lat, area.lng, canvas.width, canvas.height)
        const radius = area.radius * Math.min(canvas.width, canvas.height)
        
        // 填充区域
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fillStyle = getBTColor(area.intensity)
        ctx.fill()
        
        // 绘制边框
        ctx.strokeStyle = getBTBorderColor(area.intensity)
        ctx.lineWidth = 2
        ctx.stroke()
      })
      
      // 绘制配送站点
      DELIVERY_STATIONS.forEach(station => {
        const [x, y] = coordsToCanvas(station.lat, station.lng, canvas.width, canvas.height)
        
        // 绘制站点图标（蓝色小房子）
        ctx.fillStyle = '#00BFFF'
        ctx.beginPath()
        // 房子主体
        ctx.rect(x - 8, y - 6, 16, 10)
        ctx.fill()
        
        // 房子屋顶
        ctx.beginPath()
        ctx.moveTo(x - 10, y - 6)
        ctx.lineTo(x, y - 14)
        ctx.lineTo(x + 10, y - 6)
        ctx.closePath()
        ctx.fill()
        
        // 房子门
        ctx.fillStyle = '#87CEFA'
        ctx.fillRect(x - 2, y - 4, 4, 8)
      })
      
      // 将API坐标转换为我们的地图坐标系统
      const normalizedFrom = normalizeCoords(fromCoords)
      const normalizedTo = normalizeCoords(toCoords)
      
      // 生成路径点
      const pathPoints = generatePathPoints(
        normalizedFrom[0], 
        normalizedFrom[1], 
        normalizedTo[0], 
        normalizedTo[1],
        canvas.width,
        canvas.height
      )
      
      // 绘制路径
      ctx.beginPath()
      ctx.moveTo(pathPoints[0][0], pathPoints[0][1])
      
      for (let i = 1; i < pathPoints.length; i++) {
        ctx.lineTo(pathPoints[i][0], pathPoints[i][1])
      }
      
      // 设置路径样式
      ctx.strokeStyle = '#00FFFF' // 青色
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      // 发光效果
      ctx.shadowColor = '#00FFFF'
      ctx.shadowBlur = 10
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
      
      // 绘制路径
      ctx.stroke()
      
      // 重置阴影效果
      ctx.shadowColor = 'transparent'
      
      // 绘制起点和终点标记
      const [startX, startY] = coordsToCanvas(
        normalizedFrom[0], 
        normalizedFrom[1], 
        canvas.width, 
        canvas.height
      )
      const [endX, endY] = coordsToCanvas(
        normalizedTo[0], 
        normalizedTo[1], 
        canvas.width, 
        canvas.height
      )
      
      // 起点标记（绿色）
      ctx.beginPath()
      ctx.arc(startX, startY, 8, 0, Math.PI * 2)
      ctx.fillStyle = '#00FF00'
      ctx.fill()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.stroke()
      
      // 终点标记（红色）
      ctx.beginPath()
      ctx.arc(endX, endY, 8, 0, Math.PI * 2)
      ctx.fillStyle = '#FF0000'
      ctx.fill()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }, [canvasRef, routeData, canvasSize, fromCoords, toCoords])

  if (loading) {
    return (
      <div className="w-full h-96 bg-gray-800 border border-orange-500/30 rounded-lg flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-orange-300 font-mono text-sm">{t('loadingRoute')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-96 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 font-mono text-sm mb-4">{error}</p>
          <button 
            onClick={calculateRoute}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-mono text-sm transition-colors"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-gray-900 border border-orange-500/30 rounded-lg overflow-hidden relative">
      {/* 地图画布 */}
      <canvas 
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="w-full h-auto"
      />
      
      {/* 路线信息面板 */}
      {routeData && (
        <div className="absolute top-4 left-4 bg-gray-800/90 border border-orange-500/30 rounded-lg p-4 backdrop-blur-sm">
          <h3 className="text-orange-300 font-mono text-sm font-bold mb-2">{t('routeInfo')}</h3>
          <div className="space-y-1 text-xs font-mono">
            <p className="text-gray-400">
              <span className="text-orange-200">{t('distance')}:</span> {(routeData.distance / 1000).toFixed(1)} km
            </p>
            <p className="text-gray-400">
              <span className="text-orange-200">{t('duration')}:</span> {Math.round(routeData.duration)} {t('minutes')}
            </p>
          </div>
        </div>
      )}

      {/* BT图例 */}
      <div className="absolute bottom-4 right-4 bg-gray-800/90 border border-orange-500/30 rounded-lg p-3 backdrop-blur-sm">
        <h4 className="text-orange-300 font-mono text-xs font-bold mb-2">{t('btLegend')}</h4>
        <div className="space-y-1">
          {['high', 'medium', 'low', 'timefall'].map((intensity) => (
            <div key={intensity} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full border"
                style={{ 
                  backgroundColor: getBTColor(intensity),
                  borderColor: getBTBorderColor(intensity)
                }}
              />
              <span className="text-gray-400 font-mono text-xs">
                {getIntensityText(intensity)}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* 地图信息 */}
      <div className="absolute bottom-4 left-4 bg-gray-800/90 border border-orange-500/30 rounded-lg p-3 backdrop-blur-sm">
        <h4 className="text-orange-300 font-mono text-xs font-bold mb-2">
          {fromAddress} → {toAddress}
        </h4>
        <p className="text-gray-400 font-mono text-xs">
          {t('btLegend')}: {BT_AREAS.length} {t('btArea')}
        </p>
      </div>
    </div>
  )
} 