package websocket

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"bridges-backend/pkg/types"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow connections from any origin for development
		return true
	},
}

// Client represents a WebSocket client (porter terminal)
type Client struct {
	ID       uuid.UUID
	PorterID *uuid.UUID
	Conn     *websocket.Conn
	Send     chan []byte
	Hub      *Hub
}

// Hub maintains the set of active clients and broadcasts messages to them
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from the clients
	broadcast chan []byte

	// Register requests from the clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Map of porter ID to client for targeted messaging
	porterClients map[uuid.UUID]*Client

	mu sync.RWMutex
}

// NewHub creates a new WebSocket hub
func NewHub() *Hub {
	return &Hub{
		broadcast:     make(chan []byte),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		clients:       make(map[*Client]bool),
		porterClients: make(map[uuid.UUID]*Client),
	}
}

// Run starts the hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			if client.PorterID != nil {
				h.porterClients[*client.PorterID] = client
			}
			h.mu.Unlock()
			log.Printf("Client %s registered", client.ID)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				if client.PorterID != nil {
					delete(h.porterClients, *client.PorterID)
				}
				close(client.Send)
			}
			h.mu.Unlock()
			log.Printf("Client %s unregistered", client.ID)

		case message := <-h.broadcast:
			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.clients, client)
					if client.PorterID != nil {
						delete(h.porterClients, *client.PorterID)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// SendToPorter sends a message to a specific porter
func (h *Hub) SendToPorter(porterID uuid.UUID, message types.WebSocketMessage) error {
	h.mu.RLock()
	client, exists := h.porterClients[porterID]
	h.mu.RUnlock()

	if !exists {
		return &WebSocketError{Message: "porter not connected"}
	}

	data, err := json.Marshal(message)
	if err != nil {
		return err
	}

	select {
	case client.Send <- data:
		return nil
	default:
		return &WebSocketError{Message: "failed to send message to porter"}
	}
}

// BroadcastToAllPorters broadcasts a message to all connected porters
func (h *Hub) BroadcastToAllPorters(message types.WebSocketMessage) error {
	data, err := json.Marshal(message)
	if err != nil {
		return err
	}

	h.broadcast <- data
	return nil
}

// HandleWebSocket handles WebSocket connections
func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		ID:   uuid.New(),
		Conn: conn,
		Send: make(chan []byte, 256),
		Hub:  h,
	}

	// Register the client
	h.register <- client

	// Start goroutines for reading and writing
	go client.writePump()
	go client.readPump()
}

// readPump pumps messages from the WebSocket connection to the hub
func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()

	for {
		var msg types.WebSocketMessage
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Handle porter identification
		if msg.Type == "identify_porter" {
			if porterIDStr, ok := msg.Payload.(string); ok {
				if porterID, err := uuid.Parse(porterIDStr); err == nil {
					c.PorterID = &porterID
					// Update the porter map
					c.Hub.mu.Lock()
					c.Hub.porterClients[porterID] = c
					c.Hub.mu.Unlock()
					log.Printf("Porter %s identified and registered", porterID)
				} else {
					log.Printf("Failed to parse porter ID: %s, error: %v", porterIDStr, err)
				}
			} else {
				log.Printf("Invalid porter ID payload type: %T", msg.Payload)
			}
		}
	}
}

// writePump pumps messages from the hub to the WebSocket connection
func (c *Client) writePump() {
	defer c.Conn.Close()

	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("WebSocket write error: %v", err)
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
