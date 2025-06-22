package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"bridges-backend/internal/models"
	"bridges-backend/internal/websocket"
	"bridges-backend/pkg/types"

	"github.com/google/uuid"
	"github.com/gorilla/mux"
)

// OrderHandler handles order-related HTTP requests
type OrderHandler struct {
	store *models.Store
	hub   *websocket.Hub
}

// NewOrderHandler creates a new order handler
func NewOrderHandler(store *models.Store, hub *websocket.Hub) *OrderHandler {
	return &OrderHandler{
		store: store,
		hub:   hub,
	}
}

// CreateOrder handles POST /api/orders
func (h *OrderHandler) CreateOrder(w http.ResponseWriter, r *http.Request) {
	var req types.CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if req.Sender.Name == "" || req.Recipient.Name == "" || req.Item.Name == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Create the order
	order := h.store.CreateOrder(req)

	// Try to assign to an available porter
	porter := h.store.GetAvailablePorter()
	if porter != nil {
		err := h.store.AssignOrderToPorter(order.ID, porter.ID)
		if err != nil {
			log.Printf("Failed to assign order to porter: %v", err)
		} else {
			// Send the order to the porter via WebSocket
			message := types.WebSocketMessage{
				Type:    "new_order",
				Payload: order,
			}
			if err := h.hub.SendToPorter(porter.ID, message); err != nil {
				log.Printf("Failed to send order to porter via WebSocket: %v", err)
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(order)
}

// GetOrders handles GET /api/orders
func (h *OrderHandler) GetOrders(w http.ResponseWriter, r *http.Request) {
	orders := h.store.GetAllOrders()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}

// GetOrder handles GET /api/orders/{id}
func (h *OrderHandler) GetOrder(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	orderID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid order ID", http.StatusBadRequest)
		return
	}

	order, exists := h.store.GetOrder(orderID)
	if !exists {
		http.Error(w, "Order not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(order)
}

// GetPorterOrders handles GET /api/porters/{id}/orders
func (h *OrderHandler) GetPorterOrders(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	porterID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid porter ID", http.StatusBadRequest)
		return
	}

	orders := h.store.GetPorterOrders(porterID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(orders)
}

// UpdateOrderStatus handles PATCH /api/orders/{id}/status
func (h *OrderHandler) UpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	orderID, err := uuid.Parse(vars["id"])
	if err != nil {
		http.Error(w, "Invalid order ID", http.StatusBadRequest)
		return
	}

	var req struct {
		Status types.OrderStatus `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	err = h.store.UpdateOrderStatus(orderID, req.Status)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// Get updated order
	order, _ := h.store.GetOrder(orderID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(order)
}
