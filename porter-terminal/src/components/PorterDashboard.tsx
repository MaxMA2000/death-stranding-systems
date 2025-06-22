'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import MapComponent from './MapComponent'
import NavigationMap from './NavigationMap'

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

export default function PorterDashboard() {
  const t = useTranslations('dashboard')
  const [orders, setOrders] = useState<Order[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [activeTab, setActiveTab] = useState<'orders' | 'map'>('orders')
  const [porterLocation, setPorterLocation] = useState<{ lat: number; lng: number }>({ lat: 34.0522, lng: -118.2437 })
  const [showNavigationMap, setShowNavigationMap] = useState(false)
  const [navigationOrder, setNavigationOrder] = useState<Order | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout | null = null
    let isComponentMounted = true

    // Connect to WebSocket
    const connectWebSocket = () => {
      // Don't create new connection if component is unmounted or if one already exists
      if (!isComponentMounted || (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING)) {
        return
      }

      // Close existing connection if any
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close()
      }

      try {
        console.log('Attempting to connect to WebSocket...')
        const ws = new WebSocket('ws://localhost:8081/ws')
        wsRef.current = ws

        ws.onopen = () => {
          if (!isComponentMounted) {
            console.log('Component unmounted, closing WebSocket')
            ws.close()
            return
          }
          
          console.log('WebSocket connected successfully')
          setConnectionStatus('connected')
          
          // Identify as Sam Porter Bridges using the known UUID
          const identifyMessage = {
            type: 'identify_porter',
            payload: '550e8400-e29b-41d4-a716-446655440000'
          }
          console.log('Sending porter identification:', identifyMessage)
          ws.send(JSON.stringify(identifyMessage))
        }

        ws.onmessage = (event) => {
          if (!isComponentMounted) return
          
          try {
            const message = JSON.parse(event.data)
            console.log('Received message:', message)
            
            switch (message.type) {
              case 'new_order':
                setOrders(prev => [message.payload, ...prev])
                break
              case 'bt_alert':
                // Handle BT area alerts
                console.log('BT Alert received:', message.payload)
                break
              case 'navigation_update':
                // Handle navigation updates
                console.log('Navigation update:', message.payload)
                break
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        ws.onclose = (event) => {
          if (!isComponentMounted) return
          
          console.log('WebSocket disconnected', event.code, event.reason)
          setConnectionStatus('disconnected')
          
          // Only attempt to reconnect if the close wasn't intentional (code 1000)
          if (event.code !== 1000 && isComponentMounted) {
            console.log('Attempting to reconnect in 3 seconds...')
            reconnectTimeout = setTimeout(() => {
              if (isComponentMounted) {
                connectWebSocket()
              }
            }, 3000)
          }
        }

        ws.onerror = (error) => {
          if (!isComponentMounted) return
          
          // console.error('WebSocket error:', error)
          setConnectionStatus('disconnected')
        }
      } catch (error) {
        console.error('Failed to connect WebSocket:', error)
        if (isComponentMounted) {
          setConnectionStatus('disconnected')
          reconnectTimeout = setTimeout(() => {
            if (isComponentMounted) {
              connectWebSocket()
            }
          }, 3000)
        }
      }
    }

    // Initial connection
    connectWebSocket()

    // Cleanup on unmount
    return () => {
      isComponentMounted = false
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close(1000, 'Component unmounting')
      }
    }
  }, [])

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`http://localhost:8081/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      })

      if (response.ok) {
        setOrders(prev => 
          prev.map(order => 
            order.id === orderId ? { ...order, status } : order
          )
        )
      }
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  const updatePorterLocation = async (location: { lat: number; lng: number }) => {
    setPorterLocation(location)
    
    try {
      await fetch('http://localhost:8081/api/porters/550e8400-e29b-41d4-a716-446655440000/location', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location }),
      })
    } catch (error) {
      console.error('Error updating porter location:', error)
    }
  }

  const showNavigation = (order: Order) => {
    setNavigationOrder(order)
    setShowNavigationMap(true)
  }

  const closeNavigation = () => {
    setShowNavigationMap(false)
    setNavigationOrder(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-400'
      case 'assigned': return 'text-blue-400'
      case 'in_progress': return 'text-orange-400'
      case 'completed': return 'text-green-400'
      case 'cancelled': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Emergency': return 'text-red-400 bg-red-900/20'
      case 'Medical': return 'text-green-400 bg-green-900/20'
      case 'Fragile': return 'text-yellow-400 bg-yellow-900/20'
      case 'Hazardous': return 'text-purple-400 bg-purple-900/20'
      default: return 'text-blue-400 bg-blue-900/20'
    }
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between border-b border-orange-500/30 pb-4">
        <div>
          <h2 className="text-2xl font-mono text-orange-300 tracking-wider">{t('title')}</h2>
          <p className="text-orange-400/80 font-mono text-sm mt-1">
            {t('ordersInQueue', { count: orders.length })}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 
              connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 
              'bg-red-400'
            }`}></div>
            <span className="font-mono text-sm text-orange-200">
              {t(`connectionStatus.${connectionStatus}`)}
            </span>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex bg-gray-800/50 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 font-mono text-sm rounded transition-all ${
                activeTab === 'orders'
                  ? 'bg-orange-600 text-white'
                  : 'text-orange-300 hover:text-white hover:bg-orange-600/50'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`px-4 py-2 font-mono text-sm rounded transition-all ${
                activeTab === 'map'
                  ? 'bg-orange-600 text-white'
                  : 'text-orange-300 hover:text-white hover:bg-orange-600/50'
              }`}
            >
              Map
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'orders' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-mono text-orange-300 border-b border-orange-500/20 pb-2">
            {t('activeOrders')}
          </h3>
          
          {orders.length === 0 ? (
            <div className="bg-gray-700/30 border border-orange-500/20 rounded-lg p-6 text-center">
              <p className="text-orange-300/60 font-mono">{t('noOrders')}</p>
              <p className="text-orange-400/40 font-mono text-sm mt-1">
                {t('waitingForDeliveries')}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-gray-700/30 border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                    selectedOrder?.id === order.id
                      ? 'border-orange-400 bg-orange-900/20'
                      : 'border-orange-500/20 hover:border-orange-400/50'
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-orange-300 font-mono text-sm font-bold">
                        {order.item.name}
                      </h4>
                      <p className="text-orange-400/80 font-mono text-xs">
                        {order.sender.knot_city} → {order.recipient.knot_city}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`font-mono text-xs px-2 py-1 rounded ${getCategoryColor(order.item.category)}`}>
                        {order.item.category}
                      </span>
                      <p className={`font-mono text-xs mt-1 ${getStatusColor(order.status)}`}>
                        {t(`status.${order.status}`)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-orange-400/60 font-mono">
                      {t('orderInfo.weight', { weight: order.item.weight })}
                    </span>
                    <span className="text-orange-400/60 font-mono">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-mono text-orange-300 border-b border-orange-500/20 pb-2">
            {t('orderDetails')}
          </h3>
          
          {selectedOrder ? (
            <div className="bg-gray-700/30 border border-orange-500/20 rounded-lg p-4 space-y-4">
              <div>
                <h4 className="text-orange-300 font-mono text-lg mb-2">{selectedOrder.item.name}</h4>
                <p className="text-orange-400/80 font-mono text-sm">{selectedOrder.item.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="text-orange-300 font-mono text-sm mb-1">{t('orderInfo.from')}</h5>
                  <p className="text-orange-200 font-mono text-xs">{selectedOrder.sender.name}</p>
                  <p className="text-orange-400/60 font-mono text-xs">{selectedOrder.sender.location}</p>
                  <p className="text-orange-400/60 font-mono text-xs">{selectedOrder.sender.knot_city}</p>
                </div>
                
                <div>
                  <h5 className="text-orange-300 font-mono text-sm mb-1">{t('orderInfo.to')}</h5>
                  <p className="text-orange-200 font-mono text-xs">{selectedOrder.recipient.name}</p>
                  <p className="text-orange-400/60 font-mono text-xs">{selectedOrder.recipient.location}</p>
                  <p className="text-orange-400/60 font-mono text-xs">{selectedOrder.recipient.knot_city}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="text-orange-300 font-mono text-sm mb-1">{t('orderInfo.pickup')}</h5>
                  <p className="text-orange-400/80 font-mono text-xs">{selectedOrder.pickup_method}</p>
                </div>
                
                <div>
                  <h5 className="text-orange-300 font-mono text-sm mb-1">{t('orderInfo.payment')}</h5>
                  <p className="text-orange-400/80 font-mono text-xs">{selectedOrder.payment_info}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-4 border-t border-orange-500/20">
                {/* Navigation Button - Always available */}
                <button
                  onClick={() => showNavigation(selectedOrder)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs py-2 px-4 rounded transition-colors"
                >
                  🗺️ 导航
                </button>

                {selectedOrder.status === 'assigned' && (
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'in_progress')}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-mono text-xs py-2 px-4 rounded transition-colors"
                  >
                    {t('actions.startDelivery')}
                  </button>
                )}
                
                {selectedOrder.status === 'in_progress' && (
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-mono text-xs py-2 px-4 rounded transition-colors"
                  >
                    {t('actions.completeDelivery')}
                  </button>
                )}

                {(selectedOrder.status === 'assigned' || selectedOrder.status === 'in_progress') && (
                  <button
                    onClick={() => updateOrderStatus(selectedOrder.id, 'cancelled')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-mono text-xs py-2 px-4 rounded transition-colors"
                  >
                    {t('actions.cancel')}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-700/30 border border-orange-500/20 rounded-lg p-6 text-center">
              <p className="text-orange-300/60 font-mono">{t('selectOrder')}</p>
            </div>
          )}
        </div>
      </div>
      ) : (
        <div className="h-[600px]">
          <MapComponent 
            selectedOrder={selectedOrder}
            porterLocation={porterLocation}
            onLocationUpdate={updatePorterLocation}
          />
        </div>
      )}
      
      {/* Navigation Map Modal */}
      {showNavigationMap && navigationOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-orange-500/30 rounded-lg w-[90vw] h-[80vh] max-w-6xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-orange-500/30">
              <div>
                <h3 className="text-xl font-mono text-orange-300">{t('navigation')}</h3>
                <p className="text-orange-400/80 text-sm mt-1">
                  {navigationOrder.sender.name} → {navigationOrder.recipient.name}
                </p>
              </div>
              <button 
                onClick={closeNavigation}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-orange-300 rounded font-mono transition-colors"
              >
                {t('close')}
              </button>
            </div>

            {/* Map Container */}
            <div className="flex-1 p-4">
              <NavigationMap 
                fromAddress={navigationOrder.sender.location}
                fromCoords={[navigationOrder.sender.coordinates.lat, navigationOrder.sender.coordinates.lng]}
                toAddress={navigationOrder.recipient.location}
                toCoords={[navigationOrder.recipient.coordinates.lat, navigationOrder.recipient.coordinates.lng]}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 