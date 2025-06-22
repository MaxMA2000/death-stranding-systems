package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"bridges-backend/internal/models"
	"bridges-backend/internal/websocket"
	"bridges-backend/pkg/types"

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
	fmt.Printf("Received POST /api/orders request from %s\n", r.RemoteAddr)

	var req types.CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		fmt.Printf("Failed to decode JSON: %v\n", err)
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	fmt.Printf("Successfully decoded order request: %+v\n", req)

	// Convert request to order
	order := &types.Order{
		Sender:       req.Sender,
		Recipient:    req.Recipient,
		Item:         req.Item,
		PickupMethod: req.PickupMethod,
		PaymentInfo:  req.PaymentInfo,
	}

	if err := h.store.CreateOrder(order); err != nil {
		fmt.Printf("Failed to create order: %v\n", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Printf("Order created successfully: ID=%s, Status=%s\n", order.ID, order.Status)

	// Notify porter if order was assigned
	if order.Status == types.OrderStatusAssigned && order.PorterID != "" {
		fmt.Printf("Notifying porter %s about new order %s\n", order.PorterID, order.ID)
		h.hub.SendToPorter(order.PorterID, websocket.MessageTypeNewOrder, order)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(order); err != nil {
		fmt.Printf("Failed to encode response: %v\n", err)
	} else {
		fmt.Printf("Response sent successfully for order %s\n", order.ID)
	}
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
	id := vars["id"]

	order, err := h.store.GetOrder(id)
	if err != nil {
		http.Error(w, "Order not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(order)
}

// UpdateOrderStatus handles PATCH /api/orders/{id}/status
func (h *OrderHandler) UpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if err := h.store.UpdateOrderStatus(id, req.Status); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Get updated order
	order, err := h.store.GetOrder(id)
	if err != nil {
		http.Error(w, "Order not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(order)
}

// CalculateNavigation handles POST /api/navigation/calculate
func (h *OrderHandler) CalculateNavigation(w http.ResponseWriter, r *http.Request) {
	var req types.NavigationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	response, err := h.store.CalculateNavigation(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetRoute handles GET /api/navigation/route
func (h *OrderHandler) GetRoute(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	fromLat := r.URL.Query().Get("from_lat")
	fromLng := r.URL.Query().Get("from_lng")
	toLat := r.URL.Query().Get("to_lat")
	toLng := r.URL.Query().Get("to_lng")

	if fromLat == "" || fromLng == "" || toLat == "" || toLng == "" {
		http.Error(w, "Missing required parameters: from_lat, from_lng, to_lat, to_lng", http.StatusBadRequest)
		return
	}

	// Convert to floats (add error handling if needed)
	from := types.Coordinates{}
	to := types.Coordinates{}

	if _, err := fmt.Sscanf(fromLat, "%f", &from.Lat); err != nil {
		http.Error(w, "Invalid from_lat parameter", http.StatusBadRequest)
		return
	}
	if _, err := fmt.Sscanf(fromLng, "%f", &from.Lng); err != nil {
		http.Error(w, "Invalid from_lng parameter", http.StatusBadRequest)
		return
	}
	if _, err := fmt.Sscanf(toLat, "%f", &to.Lat); err != nil {
		http.Error(w, "Invalid to_lat parameter", http.StatusBadRequest)
		return
	}
	if _, err := fmt.Sscanf(toLng, "%f", &to.Lng); err != nil {
		http.Error(w, "Invalid to_lng parameter", http.StatusBadRequest)
		return
	}

	// Use the existing navigation calculation logic
	req := types.NavigationRequest{
		From: from,
		To:   to,
	}

	response, err := h.store.CalculateNavigation(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetBTAreas handles GET /api/bt-areas
func (h *OrderHandler) GetBTAreas(w http.ResponseWriter, r *http.Request) {
	areas := h.store.GetBTAreas()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(areas)
}

// CreateBTArea handles POST /api/bt-areas
func (h *OrderHandler) CreateBTArea(w http.ResponseWriter, r *http.Request) {
	var area types.BTArea
	if err := json.NewDecoder(r.Body).Decode(&area); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if err := h.store.CreateBTArea(area); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Broadcast BT alert to all porters
	h.hub.BroadcastBTAlert(area)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(area)
}

// UpdateBTArea handles PUT /api/bt-areas/{id}
func (h *OrderHandler) UpdateBTArea(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var area types.BTArea
	if err := json.NewDecoder(r.Body).Decode(&area); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if err := h.store.UpdateBTArea(id, area); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Broadcast updated BT alert to all porters
	h.hub.BroadcastBTAlert(area)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(area)
}

// GetPorters handles GET /api/porters
func (h *OrderHandler) GetPorters(w http.ResponseWriter, r *http.Request) {
	porters := h.store.GetAllPorters()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(porters)
}

// UpdatePorterLocation handles PATCH /api/porters/{id}/location
func (h *OrderHandler) UpdatePorterLocation(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var req struct {
		Location types.Coordinates `json:"location"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if err := h.store.UpdatePorterLocation(id, req.Location); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// RegisterRoutes registers all the routes for the order handler
func (h *OrderHandler) RegisterRoutes(router *mux.Router) {
	// Order routes
	router.HandleFunc("/api/orders", h.CreateOrder).Methods("POST")
	router.HandleFunc("/api/orders", h.GetOrders).Methods("GET")
	router.HandleFunc("/api/orders/{id}", h.GetOrder).Methods("GET")
	router.HandleFunc("/api/orders/{id}/status", h.UpdateOrderStatus).Methods("PATCH")

	// Navigation routes
	router.HandleFunc("/api/navigation/calculate", h.CalculateNavigation).Methods("POST")
	router.HandleFunc("/api/navigation/route", h.GetRoute).Methods("GET")

	// BT area routes
	router.HandleFunc("/api/bt-areas", h.GetBTAreas).Methods("GET")
	router.HandleFunc("/api/bt-areas", h.CreateBTArea).Methods("POST")
	router.HandleFunc("/api/bt-areas/{id}", h.UpdateBTArea).Methods("PUT")

	// Porter routes
	router.HandleFunc("/api/porters", h.GetPorters).Methods("GET")
	router.HandleFunc("/api/porters/{id}/location", h.UpdatePorterLocation).Methods("PATCH")
}

// CORS middleware
func (h *OrderHandler) EnableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
