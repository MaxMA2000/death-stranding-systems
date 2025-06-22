package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"bridges-backend/pkg/types"

	"github.com/gorilla/websocket"
)

// Forward declaration to avoid circular import
type OrderStore interface {
	GetAllOrders() []*types.Order
}

// Hub maintains the set of active clients and broadcasts messages to the clients
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Porter connections mapped by porter ID
	porters map[string]*Client

	// Inbound messages from the clients
	broadcast chan []byte

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Mutex for thread safety
	mu sync.RWMutex

	// Store reference for getting orders
	store OrderStore
}

// Client is a middleman between the websocket connection and the hub
type Client struct {
	hub *Hub

	// The websocket connection
	conn *websocket.Conn

	// Buffered channel of outbound messages
	send chan []byte

	// Porter ID if this client is a porter
	porterID string
}

// Message types
const (
	MessageTypeNewOrder         = "new_order"
	MessageTypeBTAlert          = "bt_alert"
	MessageTypeRouteUpdate      = "route_update"
	MessageTypeIdentifyPorter   = "identify_porter"
	MessageTypeNavigationUpdate = "navigation_update"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin for development
		return true
	},
}

// NewHub creates a new Hub
func NewHub(store OrderStore) *Hub {
	return &Hub{
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		porters:    make(map[string]*Client),
		store:      store,
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			log.Printf("Client registered")

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)

				// Remove from porters map if it was a porter
				if client.porterID != "" {
					delete(h.porters, client.porterID)
					log.Printf("Porter %s disconnected", client.porterID)
				}
			}
			h.mu.Unlock()
			log.Printf("Client unregistered")

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// ServeWS handles websocket requests from the peer
func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	client := &Client{
		hub:  h,
		conn: conn,
		send: make(chan []byte, 256),
	}

	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in new goroutines
	go client.writePump()
	go client.readPump()
}

// SendToPorter sends a message to a specific porter
func (h *Hub) SendToPorter(porterID string, messageType string, payload interface{}) error {
	h.mu.RLock()
	client, exists := h.porters[porterID]
	h.mu.RUnlock()

	if !exists {
		return nil // Porter not connected, skip
	}

	message := types.WebSocketMessage{
		Type:    messageType,
		Payload: payload,
	}

	data, err := json.Marshal(message)
	if err != nil {
		return err
	}

	select {
	case client.send <- data:
	default:
		close(client.send)
		h.mu.Lock()
		delete(h.clients, client)
		delete(h.porters, porterID)
		h.mu.Unlock()
	}

	return nil
}

// BroadcastToAllPorters sends a message to all connected porters
func (h *Hub) BroadcastToAllPorters(messageType string, payload interface{}) error {
	message := types.WebSocketMessage{
		Type:    messageType,
		Payload: payload,
	}

	data, err := json.Marshal(message)
	if err != nil {
		return err
	}

	h.mu.RLock()
	for _, client := range h.porters {
		select {
		case client.send <- data:
		default:
			close(client.send)
			delete(h.clients, client)
		}
	}
	h.mu.RUnlock()

	return nil
}

// BroadcastBTAlert sends BT area alerts to all porters
func (h *Hub) BroadcastBTAlert(btArea types.BTArea) error {
	return h.BroadcastToAllPorters(MessageTypeBTAlert, btArea)
}

// SendNavigationUpdate sends navigation updates to a specific porter
func (h *Hub) SendNavigationUpdate(porterID string, route types.Route) error {
	return h.SendToPorter(porterID, MessageTypeNavigationUpdate, route)
}

// readPump pumps messages from the websocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		// Handle incoming messages
		var wsMessage types.WebSocketMessage
		if err := json.Unmarshal(message, &wsMessage); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}

		switch wsMessage.Type {
		case MessageTypeIdentifyPorter:
			if porterID, ok := wsMessage.Payload.(string); ok {
				c.porterID = porterID
				c.hub.mu.Lock()
				c.hub.porters[porterID] = c
				c.hub.mu.Unlock()
				log.Printf("Porter identified: %s", porterID)

				// Send initial orders to the newly connected porter
				c.hub.sendInitialOrdersToPorter(porterID)
			}
		}
	}
}

// writePump pumps messages from the hub to the websocket connection
func (c *Client) writePump() {
	defer c.conn.Close()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Println(err)
				return
			}
		}
	}
}

// WebSocketError represents a WebSocket-related error
type WebSocketError struct {
	Message string
}

func (e *WebSocketError) Error() string {
	return e.Message
}

// sendInitialOrdersToPorter sends all existing orders to a newly connected porter
func (h *Hub) sendInitialOrdersToPorter(porterID string) {
	if h.store == nil {
		return
	}

	orders := h.store.GetAllOrders()
	for _, order := range orders {
		// Send each order as a new_order message
		h.SendToPorter(porterID, MessageTypeNewOrder, order)
	}
	log.Printf("Sent %d initial orders to porter %s", len(orders), porterID)
}
