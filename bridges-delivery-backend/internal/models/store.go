package models

import (
	"log"
	"sync"
	"time"

	"bridges-backend/pkg/types"

	"github.com/google/uuid"
)

// Store represents an in-memory store for orders and porters
type Store struct {
	mu      sync.RWMutex
	orders  map[uuid.UUID]*types.Order
	porters map[uuid.UUID]*types.Porter
}

// NewStore creates a new instance of the store
func NewStore() *Store {
	store := &Store{
		orders:  make(map[uuid.UUID]*types.Order),
		porters: make(map[uuid.UUID]*types.Porter),
	}

	// Initialize with some mock porters
	store.initializeMockPorters()

	return store
}

// CreateOrder creates a new order
func (s *Store) CreateOrder(req types.CreateOrderRequest) *types.Order {
	s.mu.Lock()
	defer s.mu.Unlock()

	order := &types.Order{
		ID:           uuid.New(),
		Sender:       req.Sender,
		Recipient:    req.Recipient,
		Item:         req.Item,
		PickupMethod: req.PickupMethod,
		PaymentInfo:  req.PaymentInfo,
		Status:       types.OrderStatusPending,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	s.orders[order.ID] = order
	return order
}

// GetOrder retrieves an order by ID
func (s *Store) GetOrder(id uuid.UUID) (*types.Order, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	order, exists := s.orders[id]
	return order, exists
}

// GetAllOrders returns all orders
func (s *Store) GetAllOrders() []*types.Order {
	s.mu.RLock()
	defer s.mu.RUnlock()

	orders := make([]*types.Order, 0, len(s.orders))
	for _, order := range s.orders {
		orders = append(orders, order)
	}
	return orders
}

// AssignOrderToPorter assigns an order to a porter
func (s *Store) AssignOrderToPorter(orderID, porterID uuid.UUID) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	order, exists := s.orders[orderID]
	if !exists {
		return ErrOrderNotFound
	}

	porter, exists := s.porters[porterID]
	if !exists {
		return ErrPorterNotFound
	}

	order.AssignedTo = &porterID
	order.Status = types.OrderStatusAssigned
	order.UpdatedAt = time.Now()

	porter.ActiveOrders++
	return nil
}

// GetAvailablePorter returns Sam Porter Bridges (the only porter)
func (s *Store) GetAvailablePorter() *types.Porter {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Since we only have Sam Porter Bridges, just return him if he's online
	samPorterID := uuid.MustParse("550e8400-e29b-41d4-a716-446655440000")
	porter, exists := s.porters[samPorterID]

	if exists && porter.IsOnline {
		log.Printf("Selected porter: %s (%s) with %d active orders", porter.Name, porter.ID, porter.ActiveOrders)
		return porter
	}

	log.Printf("Sam Porter Bridges not available")
	return nil
}

// GetPorterOrders returns all orders assigned to a specific porter
func (s *Store) GetPorterOrders(porterID uuid.UUID) []*types.Order {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var orders []*types.Order
	for _, order := range s.orders {
		if order.AssignedTo != nil && *order.AssignedTo == porterID {
			orders = append(orders, order)
		}
	}
	return orders
}

// UpdateOrderStatus updates the status of an order
func (s *Store) UpdateOrderStatus(orderID uuid.UUID, status types.OrderStatus) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	order, exists := s.orders[orderID]
	if !exists {
		return ErrOrderNotFound
	}

	order.Status = status
	order.UpdatedAt = time.Now()
	return nil
}

// GetPorter retrieves a porter by ID
func (s *Store) GetPorter(id uuid.UUID) (*types.Porter, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	porter, exists := s.porters[id]
	return porter, exists
}

// SetPorterOnlineStatus sets the online status of a porter
func (s *Store) SetPorterOnlineStatus(porterID uuid.UUID, isOnline bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	porter, exists := s.porters[porterID]
	if !exists {
		return ErrPorterNotFound
	}

	porter.IsOnline = isOnline
	return nil
}

// initializeMockPorters creates some mock porters for testing
func (s *Store) initializeMockPorters() {
	// Use known UUID for Sam Porter Bridges - the only porter
	samPorterID := uuid.MustParse("550e8400-e29b-41d4-a716-446655440000")

	// Only Sam Porter Bridges exists
	samPorter := &types.Porter{
		ID:           samPorterID,
		Name:         "Sam Porter Bridges",
		Status:       "available",
		ActiveOrders: 0,
		IsOnline:     true,
	}

	s.porters[samPorter.ID] = samPorter
}

// GetPorterByName retrieves a porter by name
func (s *Store) GetPorterByName(name string) (*types.Porter, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, porter := range s.porters {
		if porter.Name == name {
			return porter, true
		}
	}
	return nil, false
}

// Custom errors
var (
	ErrOrderNotFound  = &StoreError{Message: "order not found"}
	ErrPorterNotFound = &StoreError{Message: "porter not found"}
)

type StoreError struct {
	Message string
}

func (e *StoreError) Error() string {
	return e.Message
}
