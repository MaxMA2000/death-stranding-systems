package models

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"math/rand"
	"net/http"
	"net/url"
	"sync"
	"time"

	"bridges-backend/pkg/types"

	"github.com/google/uuid"
)

// Store manages orders, porters, and navigation data
type Store struct {
	orders     map[string]*types.Order
	porters    map[string]*types.Porter
	btAreas    map[string]*types.BTArea
	routes     map[string]*types.Route
	mu         sync.RWMutex
	tencentKey string
}

// NewStore creates a new store instance
func NewStore() *Store {
	store := &Store{
		orders:     make(map[string]*types.Order),
		porters:    make(map[string]*types.Porter),
		btAreas:    make(map[string]*types.BTArea),
		routes:     make(map[string]*types.Route),
		tencentKey: "KWWBZ-2OOKL-LZZP5-MFARF-7XNZJ-2UFMV",
	}

	// Initialize with mock data
	store.initializeMockData()

	// Start BT area simulation
	go store.simulateBTAreas()

	return store
}

// Order management methods
func (s *Store) CreateOrder(order *types.Order) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	order.ID = uuid.New().String()
	order.CreatedAt = time.Now()
	order.UpdatedAt = time.Now()
	order.Status = types.OrderStatusPending

	// Auto-assign to available porter
	if porter := s.findAvailablePorter(); porter != nil {
		order.Status = types.OrderStatusAssigned
		order.PorterID = porter.ID
		assignedTo := porter.ID
		order.AssignedTo = &assignedTo
		porter.Status = "busy"
		porter.ActiveOrders = append(porter.ActiveOrders, order.ID)

		// Calculate route
		if route, err := s.calculateRoute(order); err == nil {
			order.Route = route
		}
	}

	s.orders[order.ID] = order
	return nil
}

func (s *Store) GetOrder(id string) (*types.Order, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	order, exists := s.orders[id]
	if !exists {
		return nil, fmt.Errorf("order not found")
	}
	return order, nil
}

func (s *Store) GetAllOrders() []*types.Order {
	s.mu.RLock()
	defer s.mu.RUnlock()

	orders := make([]*types.Order, 0, len(s.orders))
	for _, order := range s.orders {
		orders = append(orders, order)
	}
	return orders
}

func (s *Store) UpdateOrderStatus(id string, status string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	order, exists := s.orders[id]
	if !exists {
		return fmt.Errorf("order not found")
	}

	// Convert string status to OrderStatus type
	var orderStatus types.OrderStatus
	switch status {
	case "pending":
		orderStatus = types.OrderStatusPending
	case "assigned":
		orderStatus = types.OrderStatusAssigned
	case "in_progress":
		orderStatus = types.OrderStatusInProgress
	case "completed":
		orderStatus = types.OrderStatusCompleted
	case "cancelled":
		orderStatus = types.OrderStatusCancelled
	default:
		return fmt.Errorf("invalid status: %s", status)
	}

	order.Status = orderStatus
	order.UpdatedAt = time.Now()

	// Update porter status when order is completed or cancelled
	if status == "completed" || status == "cancelled" {
		if porter, exists := s.porters[order.PorterID]; exists {
			porter.Status = "available"
			// Remove order from active orders
			for i, orderID := range porter.ActiveOrders {
				if orderID == id {
					porter.ActiveOrders = append(porter.ActiveOrders[:i], porter.ActiveOrders[i+1:]...)
					break
				}
			}
		}
	}

	return nil
}

// Porter management methods
func (s *Store) GetPorter(id string) (*types.Porter, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	porter, exists := s.porters[id]
	if !exists {
		return nil, fmt.Errorf("porter not found")
	}
	return porter, nil
}

func (s *Store) GetAllPorters() []*types.Porter {
	s.mu.RLock()
	defer s.mu.RUnlock()

	porters := make([]*types.Porter, 0, len(s.porters))
	for _, porter := range s.porters {
		porters = append(porters, porter)
	}
	return porters
}

func (s *Store) UpdatePorterLocation(id string, location types.Coordinates) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	porter, exists := s.porters[id]
	if !exists {
		return fmt.Errorf("porter not found")
	}

	porter.Location = location
	return nil
}

// Navigation and BT area methods
func (s *Store) CalculateNavigation(req types.NavigationRequest) (*types.NavigationResponse, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Get route from Tencent Maps
	route, err := s.getTencentRoute(req.From, req.To)
	if err != nil {
		return nil, err
	}

	// Apply BT avoidance if requested
	if req.AvoidBT {
		route = s.applyBTAvoidance(route, req)
	}

	// Get nearby BT areas
	nearbyBT := s.getNearbyBTAreas(route.Points, 5000) // 5km radius

	// Calculate warnings and risk assessment
	warnings := s.calculateWarnings(route, nearbyBT, req)
	estimated := s.calculateRouteInfo(route, nearbyBT, req)

	return &types.NavigationResponse{
		Route:     *route,
		Warnings:  warnings,
		BTAreas:   nearbyBT,
		Estimated: estimated,
	}, nil
}

func (s *Store) GetBTAreas() []types.BTArea {
	s.mu.RLock()
	defer s.mu.RUnlock()

	areas := make([]types.BTArea, 0, len(s.btAreas))
	for _, area := range s.btAreas {
		if area.IsActive {
			areas = append(areas, *area)
		}
	}
	return areas
}

func (s *Store) CreateBTArea(area types.BTArea) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	area.ID = uuid.New().String()
	area.CreatedAt = time.Now()
	area.IsActive = true

	s.btAreas[area.ID] = &area
	return nil
}

func (s *Store) UpdateBTArea(id string, area types.BTArea) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	existing, exists := s.btAreas[id]
	if !exists {
		return fmt.Errorf("BT area not found")
	}

	area.ID = existing.ID
	area.CreatedAt = existing.CreatedAt
	s.btAreas[id] = &area
	return nil
}

// Private helper methods
func (s *Store) findAvailablePorter() *types.Porter {
	for _, porter := range s.porters {
		if porter.Status == "available" {
			return porter
		}
	}
	return nil
}

func (s *Store) calculateRoute(order *types.Order) (*types.Route, error) {
	req := types.NavigationRequest{
		From:        order.Sender.Coordinates,
		To:          order.Recipient.Coordinates,
		AvoidBT:     true,
		CargoWeight: order.Item.Weight,
		Equipment:   []string{"standard"},
	}

	resp, err := s.CalculateNavigation(req)
	if err != nil {
		return nil, err
	}

	return &resp.Route, nil
}

func (s *Store) getTencentRoute(from, to types.Coordinates) (*types.Route, error) {
	// Tencent Maps Directions API - 根据腾讯位置服务文档优化
	baseURL := "https://apis.map.qq.com/ws/direction/v1/driving/"

	params := url.Values{}
	// 腾讯地图API要求经纬度格式为 "纬度,经度"
	params.Set("from", fmt.Sprintf("%.6f,%.6f", from.Lat, from.Lng))
	params.Set("to", fmt.Sprintf("%.6f,%.6f", to.Lat, to.Lng))
	params.Set("key", s.tencentKey)
	params.Set("output", "json")
	// 添加更多参数以提高成功率
	params.Set("policy", "LEAST_TIME") // 最短时间路径
	params.Set("waypoints", "")        // 途经点，暂时为空
	params.Set("avoid_polygons", "")   // 避让区域，可以用于BT区域避让
	params.Set("road_type", "0")       // 道路类型：0不限制

	// 创建HTTP客户端，设置超时
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	fullURL := baseURL + "?" + params.Encode()
	log.Printf("Requesting Tencent Maps API: %s", fullURL)

	resp, err := client.Get(fullURL)
	if err != nil {
		log.Printf("Tencent API request failed: %v - using mock route", err)
		return s.generateMockRoute(from, to), nil
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Tencent API response read failed: %v - using mock route", err)
		return s.generateMockRoute(from, to), nil
	}

	var tencentResp TencentRouteResponse
	if err := json.Unmarshal(body, &tencentResp); err != nil {
		log.Printf("Tencent API response parse failed: %v - using mock route", err)
		return s.generateMockRoute(from, to), nil
	}

	if tencentResp.Status != 0 {
		// API error - 根据错误码提供更详细的信息
		errorMsg := s.getTencentErrorMessage(tencentResp.Status)
		log.Printf("Tencent API error: %s (status: %d) - using mock route", errorMsg, tencentResp.Status)
		return s.generateMockRoute(from, to), nil
	}

	// Convert Tencent response to our route format
	route := &types.Route{
		ID:        uuid.New().String(),
		CreatedAt: time.Now(),
	}

	if len(tencentResp.Result.Routes) > 0 {
		tencentRoute := tencentResp.Result.Routes[0]
		route.Distance = float64(tencentRoute.Distance)
		route.Duration = tencentRoute.Duration

		// Convert polyline to coordinates
		route.Points = s.decodePolyline(tencentRoute.Polyline)

		// Add checkpoints (simplified - using waypoints)
		route.Checkpoints = s.generateCheckpoints(route.Points)

		log.Printf("Successfully calculated route: %.2fkm, %d minutes",
			route.Distance/1000, route.Duration/60)
	}

	return route, nil
}

// 根据腾讯地图API错误码返回中文错误信息
func (s *Store) getTencentErrorMessage(status int) string {
	switch status {
	case 110:
		return "请求参数信息有误"
	case 121:
		return "用户账户配额不足"
	case 122:
		return "用户签名校验失败"
	case 311:
		return "请求参数信息有误"
	case 310:
		return "请求参数信息有误，缺少必要参数key"
	case 306:
		return "请求有护持信息请检查字符串"
	case 301:
		return "请求参数信息有误，缺少必要参数"
	case 302:
		return "请求参数信息有误，参数值格式不正确"
	default:
		return fmt.Sprintf("未知错误 (状态码: %d)", status)
	}
}

func (s *Store) generateMockRoute(from, to types.Coordinates) *types.Route {
	// Generate a mock route for demo purposes when Tencent API fails
	distance := s.calculateDistance(from, to)

	// Generate intermediate points (simple linear interpolation)
	points := make([]types.Coordinates, 0)
	points = append(points, from)

	// Add some intermediate points
	steps := 5
	for i := 1; i < steps; i++ {
		ratio := float64(i) / float64(steps)
		point := types.Coordinates{
			Lat: from.Lat + (to.Lat-from.Lat)*ratio,
			Lng: from.Lng + (to.Lng-from.Lng)*ratio,
		}
		points = append(points, point)
	}

	points = append(points, to)

	// Create route
	route := &types.Route{
		ID:        uuid.New().String(),
		CreatedAt: time.Now(),
		Distance:  distance,
		Duration:  int(distance / 50), // Assume 50m/s average speed
		Points:    points,
	}

	// Generate checkpoints
	route.Checkpoints = s.generateCheckpoints(route.Points)

	return route
}

func (s *Store) applyBTAvoidance(route *types.Route, req types.NavigationRequest) *types.Route {
	// Check each point in the route against BT areas
	safePoints := make([]types.Coordinates, 0)

	for _, point := range route.Points {
		isSafe := true
		for _, btArea := range s.btAreas {
			if btArea.IsActive && s.isPointInBTArea(point, *btArea) {
				isSafe = false
				break
			}
		}

		if isSafe {
			safePoints = append(safePoints, point)
		} else {
			// Find alternative point around the BT area
			altPoint := s.findAlternativePoint(point, req)
			safePoints = append(safePoints, altPoint)
		}
	}

	route.Points = safePoints
	return route
}

func (s *Store) getNearbyBTAreas(points []types.Coordinates, radius float64) []types.BTArea {
	nearby := make([]types.BTArea, 0)

	for _, btArea := range s.btAreas {
		if !btArea.IsActive {
			continue
		}

		for _, point := range points {
			distance := s.calculateDistance(point, btArea.Center)
			if distance <= radius {
				nearby = append(nearby, *btArea)
				break
			}
		}
	}

	return nearby
}

func (s *Store) calculateWarnings(route *types.Route, btAreas []types.BTArea, req types.NavigationRequest) []string {
	warnings := make([]string, 0)

	// Check for BT areas
	for _, btArea := range btAreas {
		distance := s.getMinDistanceToBTArea(route.Points, btArea)
		if distance < 1000 { // Within 1km
			warnings = append(warnings, fmt.Sprintf("BT Area '%s' detected within %.0fm", btArea.Name, distance))
		}
	}

	// Check cargo weight
	if req.CargoWeight > 50 {
		warnings = append(warnings, "Heavy cargo detected - consider additional equipment")
	}

	// Check route length
	if route.Distance > 50000 { // 50km
		warnings = append(warnings, "Long distance delivery - plan for rest stops")
	}

	return warnings
}

func (s *Store) calculateRouteInfo(route *types.Route, btAreas []types.BTArea, req types.NavigationRequest) types.RouteInfo {
	info := types.RouteInfo{
		Distance:    route.Distance,
		Duration:    route.Duration,
		Difficulty:  "easy",
		BTRisk:      "low",
		WeatherRisk: "clear",
	}

	// Adjust difficulty based on distance and BT areas
	if route.Distance > 30000 || len(btAreas) > 2 {
		info.Difficulty = "medium"
	}
	if route.Distance > 50000 || len(btAreas) > 5 {
		info.Difficulty = "hard"
	}

	// Adjust BT risk
	if len(btAreas) > 0 {
		info.BTRisk = "medium"
	}
	if len(btAreas) > 3 {
		info.BTRisk = "high"
	}

	// Simulate weather risk
	if rand.Float64() < 0.3 {
		info.WeatherRisk = "rain"
	}
	if rand.Float64() < 0.1 {
		info.WeatherRisk = "timefall"
	}

	return info
}

// Utility methods
func (s *Store) calculateDistance(p1, p2 types.Coordinates) float64 {
	// Haversine formula
	const R = 6371000 // Earth radius in meters

	lat1Rad := p1.Lat * math.Pi / 180
	lat2Rad := p2.Lat * math.Pi / 180
	deltaLatRad := (p2.Lat - p1.Lat) * math.Pi / 180
	deltaLngRad := (p2.Lng - p1.Lng) * math.Pi / 180

	a := math.Sin(deltaLatRad/2)*math.Sin(deltaLatRad/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*
			math.Sin(deltaLngRad/2)*math.Sin(deltaLngRad/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}

func (s *Store) isPointInBTArea(point types.Coordinates, area types.BTArea) bool {
	distance := s.calculateDistance(point, area.Center)
	return distance <= area.Radius
}

func (s *Store) findAlternativePoint(original types.Coordinates, req types.NavigationRequest) types.Coordinates {
	// Simple implementation - offset by small amount
	return types.Coordinates{
		Lat: original.Lat + 0.001,
		Lng: original.Lng + 0.001,
	}
}

func (s *Store) getMinDistanceToBTArea(points []types.Coordinates, area types.BTArea) float64 {
	minDistance := math.Inf(1)
	for _, point := range points {
		distance := s.calculateDistance(point, area.Center) - area.Radius
		if distance < minDistance {
			minDistance = distance
		}
	}
	if minDistance < 0 {
		return 0
	}
	return minDistance
}

func (s *Store) decodePolyline(encoded string) []types.Coordinates {
	// Simplified polyline decoding - in real implementation, use proper algorithm
	// For now, return sample points
	return []types.Coordinates{
		{Lat: 39.9042, Lng: 116.4074}, // Beijing
		{Lat: 39.9142, Lng: 116.4174},
		{Lat: 39.9242, Lng: 116.4274},
	}
}

func (s *Store) generateCheckpoints(points []types.Coordinates) []types.Checkpoint {
	checkpoints := make([]types.Checkpoint, 0)

	// Add checkpoint every 10km or so
	for i := 0; i < len(points); i += len(points) / 5 {
		if i < len(points) {
			checkpoint := types.Checkpoint{
				ID:          uuid.New().String(),
				Name:        fmt.Sprintf("Checkpoint %d", len(checkpoints)+1),
				Coordinates: points[i],
				Type:        "safe_house",
				IsActive:    true,
			}
			checkpoints = append(checkpoints, checkpoint)
		}
	}

	return checkpoints
}

func (s *Store) initializeMockData() {
	// Initialize mock porters - 使用洛杉矶坐标
	samPorter := &types.Porter{
		ID:           "550e8400-e29b-41d4-a716-446655440000",
		Name:         "Sam Porter Bridges",
		Status:       "available",                                     // 改为available，这样新订单可以分配给他
		Location:     types.Coordinates{Lat: 34.0522, Lng: -118.2437}, // 洛杉矶市中心
		ActiveOrders: []string{},
		Rating:       4.9,
		Equipment:    []string{"ladder", "rope", "boots", "scanner"},
		IsOnline:     true,
	}
	s.porters[samPorter.ID] = samPorter

	// Initialize mock BT areas - 使用洛杉矶周边区域
	btAreas := []types.BTArea{
		{
			Name:      "Central Crater",
			Center:    types.Coordinates{Lat: 34.0622, Lng: -118.2537}, // 市中心北部
			Radius:    2000,
			Intensity: "high",
			IsActive:  true,
		},
		{
			Name:      "Timefall Zone Alpha",
			Center:    types.Coordinates{Lat: 34.0422, Lng: -118.2337}, // 市中心东南
			Radius:    1500,
			Intensity: "timefall",
			IsActive:  true,
		},
		{
			Name:      "BT Cluster Beta",
			Center:    types.Coordinates{Lat: 34.0722, Lng: -118.2637}, // 市中心西北
			Radius:    1000,
			Intensity: "medium",
			IsActive:  true,
		},
	}

	for _, area := range btAreas {
		area.ID = uuid.New().String()
		area.CreatedAt = time.Now()
		s.btAreas[area.ID] = &area
	}

	// Initialize sample orders
	s.createInitialOrders(samPorter)

	// Start BT area simulation
	go s.simulateBTAreas()
}

func (s *Store) createInitialOrders(porter *types.Porter) {
	// Order 1: Medical supplies delivery (in progress) - 洛杉矶医院间配送
	order1 := &types.Order{
		ID: uuid.New().String(),
		Sender: types.ContactInfo{
			Name:        "UCLA医学中心 / UCLA Medical Center",
			Location:    "韦斯特伍德医疗区 / Westwood Medical District",
			KnotCity:    "西洛杉矶结点城市 / West LA Knot City",
			Coordinates: types.Coordinates{Lat: 34.0689, Lng: -118.4452}, // UCLA医学中心
		},
		Recipient: types.ContactInfo{
			Name:        "西达斯-西奈医疗中心 / Cedars-Sinai Medical Center",
			Location:    "比佛利格罗夫急诊科 / Beverly Grove Emergency Ward",
			KnotCity:    "比佛利山结点城市 / Beverly Hills Knot City",
			Coordinates: types.Coordinates{Lat: 34.0754, Lng: -118.3844}, // Cedars-Sinai医院
		},
		Item: types.ItemInfo{
			Name:        "紧急医疗包 / Emergency Medical Kit",
			Description: "用于急救治疗的关键医疗用品 / Critical medical supplies for emergency treatment",
			Weight:      8.5,
			Category:    "医疗用品 / Medical",
		},
		PickupMethod: "快速取件 / Express Pickup",
		PaymentInfo:  "UCA网络 - 优先级 / UCA Network - Priority",
		Status:       types.OrderStatusInProgress,
		PorterID:     porter.ID,
		CreatedAt:    time.Now().Add(-2 * time.Hour),
		UpdatedAt:    time.Now().Add(-10 * time.Minute),
	}

	// Calculate route for order 1
	route1, _ := s.calculateRoute(order1)
	order1.Route = route1
	s.orders[order1.ID] = order1
	porter.ActiveOrders = append(porter.ActiveOrders, order1.ID)

	// Order 2: Equipment delivery (assigned) - 市中心到圣莫尼卡
	order2 := &types.Order{
		ID: uuid.New().String(),
		Sender: types.ContactInfo{
			Name:        "桥接装备仓库 / Bridges Equipment Depot",
			Location:    "洛杉矶市中心工业区 / Downtown LA Industrial Zone",
			KnotCity:    "洛杉矶中央结点城市 / Central LA Knot City",
			Coordinates: types.Coordinates{Lat: 34.0522, Lng: -118.2437}, // 洛杉矶市中心
		},
		Recipient: types.ContactInfo{
			Name:        "圣莫尼卡码头前哨站 / Santa Monica Pier Outpost",
			Location:    "海岸研究站 / Coastal Research Station",
			KnotCity:    "圣莫尼卡结点城市 / Santa Monica Knot City",
			Coordinates: types.Coordinates{Lat: 34.0089, Lng: -118.4973}, // 圣莫尼卡码头
		},
		Item: types.ItemInfo{
			Name:        "便携式桥梁建造器 / Portable Bridge Constructor",
			Description: "用于地形穿越的先进建造设备 / Advanced construction equipment for terrain traversal",
			Weight:      15.2,
			Category:    "设备 / Equipment",
		},
		PickupMethod: "标准取件 / Standard Pickup",
		PaymentInfo:  "桥接网络 - 标准 / Bridges Network - Standard",
		Status:       types.OrderStatusAssigned,
		PorterID:     porter.ID,
		CreatedAt:    time.Now().Add(-30 * time.Minute),
		UpdatedAt:    time.Now().Add(-25 * time.Minute),
	}

	// Calculate route for order 2
	route2, _ := s.calculateRoute(order2)
	order2.Route = route2
	s.orders[order2.ID] = order2
	porter.ActiveOrders = append(porter.ActiveOrders, order2.ID)

	// Order 3: Fragile cargo (pending) - 好莱坞到帕萨迪纳
	order3 := &types.Order{
		ID: uuid.New().String(),
		Sender: types.ContactInfo{
			Name:        "好莱坞制片厂终端 / Hollywood Studios Terminal",
			Location:    "娱乐区 / Entertainment District",
			KnotCity:    "好莱坞结点城市 / Hollywood Knot City",
			Coordinates: types.Coordinates{Lat: 34.0928, Lng: -118.3287}, // 好莱坞
		},
		Recipient: types.ContactInfo{
			Name:        "加州理工研究实验室 / Caltech Research Lab",
			Location:    "帕萨迪纳科学综合体 / Pasadena Science Complex",
			KnotCity:    "帕萨迪纳结点城市 / Pasadena Knot City",
			Coordinates: types.Coordinates{Lat: 34.1377, Lng: -118.1253}, // 加州理工学院
		},
		Item: types.ItemInfo{
			Name:        "量子纠缠装置 / Quantum Entanglement Device",
			Description: "高度敏感的科学设备 - 易碎品 / Highly sensitive scientific equipment - FRAGILE",
			Weight:      3.8,
			Category:    "科学仪器 / Scientific",
		},
		PickupMethod: "易碎品处理 / Fragile Handling",
		PaymentInfo:  "研究基金 - 优先级 / Research Grant - Priority",
		Status:       types.OrderStatusPending,
		CreatedAt:    time.Now().Add(-15 * time.Minute),
		UpdatedAt:    time.Now().Add(-15 * time.Minute),
	}

	// Calculate route for order 3
	route3, _ := s.calculateRoute(order3)
	order3.Route = route3
	s.orders[order3.ID] = order3

	// Order 4: Completed delivery (for history) - 长滩到伯班克
	order4 := &types.Order{
		ID: uuid.New().String(),
		Sender: types.ContactInfo{
			Name:        "长滩港务局 / Long Beach Port Authority",
			Location:    "货运码头综合体 / Cargo Terminal Complex",
			KnotCity:    "长滩结点城市 / Long Beach Knot City",
			Coordinates: types.Coordinates{Lat: 33.7701, Lng: -118.1937}, // 长滩港
		},
		Recipient: types.ContactInfo{
			Name:        "伯班克制片厂指挥中心 / Burbank Studios Command Center",
			Location:    "媒体制作中心 / Media Production Hub",
			KnotCity:    "伯班克结点城市 / Burbank Knot City",
			Coordinates: types.Coordinates{Lat: 34.1808, Lng: -118.3090}, // 伯班克
		},
		Item: types.ItemInfo{
			Name:        "凯拉尔水晶样本 / Chiral Crystal Sample",
			Description: "用于BT分析的研究样本 / Research sample for BT analysis",
			Weight:      1.2,
			Category:    "研究材料 / Research",
		},
		PickupMethod: "安全运输 / Secure Transport",
		PaymentInfo:  "桥接研究部门 / Bridges Research Division",
		Status:       types.OrderStatusCompleted,
		PorterID:     porter.ID,
		CreatedAt:    time.Now().Add(-6 * time.Hour),
		UpdatedAt:    time.Now().Add(-4 * time.Hour),
	}

	route4, _ := s.calculateRoute(order4)
	order4.Route = route4
	s.orders[order4.ID] = order4

	// Update porter status and active orders
	s.porters[porter.ID] = porter

	log.Printf("Initialized %d sample orders for demo", len(s.orders))
}

func (s *Store) simulateBTAreas() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		s.mu.Lock()

		// Randomly create new temporary BT areas
		if rand.Float64() < 0.3 { // 30% chance every 30 seconds
			newArea := types.BTArea{
				ID:   uuid.New().String(),
				Name: fmt.Sprintf("Temporal BT-%d", rand.Intn(1000)),
				Center: types.Coordinates{
					Lat: 34.0522 + (rand.Float64()-0.5)*0.2, // 洛杉矶周边随机位置
					Lng: -118.2437 + (rand.Float64()-0.5)*0.3,
				},
				Radius:    float64(500 + rand.Intn(1500)), // 500-2000m
				Intensity: []string{"low", "medium", "high"}[rand.Intn(3)],
				IsActive:  true,
				CreatedAt: time.Now(),
			}

			// Set expiration time (5-15 minutes)
			expiration := time.Now().Add(time.Duration(5+rand.Intn(10)) * time.Minute)
			newArea.ExpiresAt = &expiration

			s.btAreas[newArea.ID] = &newArea
			log.Printf("New temporal BT area created: %s", newArea.Name)
		}

		// Remove expired BT areas
		for id, area := range s.btAreas {
			if area.ExpiresAt != nil && time.Now().After(*area.ExpiresAt) {
				log.Printf("BT area expired: %s", area.Name)
				delete(s.btAreas, id)
			}
		}

		s.mu.Unlock()
	}
}

// Tencent Maps API response structures
type TencentRouteResponse struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
	Result  struct {
		Routes []struct {
			Distance int    `json:"distance"`
			Duration int    `json:"duration"`
			Polyline string `json:"polyline"`
		} `json:"routes"`
	} `json:"result"`
}
