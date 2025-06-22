package types

import (
	"time"
)

// OrderStatus represents the current status of an order
type OrderStatus string

const (
	OrderStatusPending    OrderStatus = "pending"
	OrderStatusAssigned   OrderStatus = "assigned"
	OrderStatusInProgress OrderStatus = "in_progress"
	OrderStatusCompleted  OrderStatus = "completed"
	OrderStatusCancelled  OrderStatus = "cancelled"
)

// ContactInfo represents sender/recipient information with coordinates
type ContactInfo struct {
	Name        string      `json:"name"`
	Location    string      `json:"location"`
	KnotCity    string      `json:"knot_city"`
	Coordinates Coordinates `json:"coordinates"`
}

// ItemInfo represents the item being delivered
type ItemInfo struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Weight      float64 `json:"weight"`
	Category    string  `json:"category"`
}

// Order represents a delivery order in the system
type Order struct {
	ID           string      `json:"id"`
	Sender       ContactInfo `json:"sender"`
	Recipient    ContactInfo `json:"recipient"`
	Item         ItemInfo    `json:"item"`
	PickupMethod string      `json:"pickup_method"`
	PaymentInfo  string      `json:"payment_info"`
	Status       OrderStatus `json:"status"`
	AssignedTo   *string     `json:"assigned_to,omitempty"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
	// Navigation fields
	Route    *Route `json:"route,omitempty"`
	PorterID string `json:"porter_id,omitempty"`
}

// CreateOrderRequest represents the request to create a new order
type CreateOrderRequest struct {
	Sender       ContactInfo `json:"sender"`
	Recipient    ContactInfo `json:"recipient"`
	Item         ItemInfo    `json:"item"`
	PickupMethod string      `json:"pickup_method"`
	PaymentInfo  string      `json:"payment_info"`
}

// Porter represents a delivery porter in the system
type Porter struct {
	ID           string      `json:"id"`
	Name         string      `json:"name"`
	Status       string      `json:"status"`
	ActiveOrders []string    `json:"active_orders"`
	IsOnline     bool        `json:"is_online"`
	Location     Coordinates `json:"location"`
	Rating       float64     `json:"rating"`
	Equipment    []string    `json:"equipment"`
}

// WebSocketMessage represents a message sent via WebSocket
type WebSocketMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// Coordinates represents geographic coordinates
type Coordinates struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// Route represents navigation route with BT avoidance
type Route struct {
	ID          string        `json:"id"`
	Points      []Coordinates `json:"points"`
	Distance    float64       `json:"distance"`    // in meters
	Duration    int           `json:"duration"`    // in seconds
	BTAreas     []BTArea      `json:"bt_areas"`    // BT areas to avoid
	Checkpoints []Checkpoint  `json:"checkpoints"` // Safe checkpoints along route
	CreatedAt   time.Time     `json:"created_at"`
}

// BTArea represents a dangerous BT (Beached Things) area
type BTArea struct {
	ID        string      `json:"id"`
	Name      string      `json:"name"`
	Center    Coordinates `json:"center"`
	Radius    float64     `json:"radius"`    // in meters
	Intensity string      `json:"intensity"` // low, medium, high, timefall
	IsActive  bool        `json:"is_active"`
	CreatedAt time.Time   `json:"created_at"`
	ExpiresAt *time.Time  `json:"expires_at,omitempty"` // for temporary BT areas
}

// Checkpoint represents a safe point along the route
type Checkpoint struct {
	ID          string      `json:"id"`
	Name        string      `json:"name"`
	Coordinates Coordinates `json:"coordinates"`
	Type        string      `json:"type"` // shelter, knot_city, safe_house
	IsActive    bool        `json:"is_active"`
}

// Navigation request for route calculation
type NavigationRequest struct {
	From        Coordinates `json:"from"`
	To          Coordinates `json:"to"`
	AvoidBT     bool        `json:"avoid_bt"`
	CargoWeight float64     `json:"cargo_weight"`
	Equipment   []string    `json:"equipment"`
}

// Navigation response with route and BT information
type NavigationResponse struct {
	Route     Route     `json:"route"`
	Warnings  []string  `json:"warnings"`
	BTAreas   []BTArea  `json:"bt_areas_nearby"`
	Estimated RouteInfo `json:"estimated"`
}

// RouteInfo contains estimated route information
type RouteInfo struct {
	Distance    float64 `json:"distance"`     // in meters
	Duration    int     `json:"duration"`     // in seconds
	Difficulty  string  `json:"difficulty"`   // easy, medium, hard, extreme
	BTRisk      string  `json:"bt_risk"`      // low, medium, high
	WeatherRisk string  `json:"weather_risk"` // clear, rain, timefall
}
