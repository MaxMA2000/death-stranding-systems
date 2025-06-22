package types

import (
	"time"

	"github.com/google/uuid"
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

// ContactInfo represents sender/recipient information
type ContactInfo struct {
	Name     string `json:"name"`
	Location string `json:"location"`
	KnotCity string `json:"knot_city"`
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
	ID           uuid.UUID   `json:"id"`
	Sender       ContactInfo `json:"sender"`
	Recipient    ContactInfo `json:"recipient"`
	Item         ItemInfo    `json:"item"`
	PickupMethod string      `json:"pickup_method"`
	PaymentInfo  string      `json:"payment_info"`
	Status       OrderStatus `json:"status"`
	AssignedTo   *uuid.UUID  `json:"assigned_to,omitempty"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
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
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	Status       string    `json:"status"`
	ActiveOrders int       `json:"active_orders"`
	IsOnline     bool      `json:"is_online"`
}

// WebSocketMessage represents a message sent via WebSocket
type WebSocketMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}
