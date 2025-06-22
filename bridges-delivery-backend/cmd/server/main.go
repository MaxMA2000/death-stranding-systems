package main

import (
	"log"
	"net/http"

	"bridges-backend/internal/handlers"
	"bridges-backend/internal/models"
	"bridges-backend/internal/websocket"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

func main() {
	// Initialize store
	store := models.NewStore()

	// Initialize WebSocket hub
	hub := websocket.NewHub(store)
	go hub.Run()

	// Initialize handlers
	orderHandler := handlers.NewOrderHandler(store, hub)

	// Setup router
	router := mux.NewRouter()

	// Register API routes
	orderHandler.RegisterRoutes(router)

	// WebSocket endpoint
	router.HandleFunc("/ws", hub.ServeWS)

	// Health check endpoint
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	handler := c.Handler(router)

	log.Println("Starting Bridges Delivery Backend on :8081")
	log.Println("WebSocket endpoint: ws://localhost:8081/ws")
	log.Println("API endpoints:")
	log.Println("  GET  /health")
	log.Println("  POST /api/orders")
	log.Println("  GET  /api/orders")
	log.Println("  GET  /api/orders/{id}")
	log.Println("  PATCH /api/orders/{id}/status")
	log.Println("  POST /api/navigation/calculate")
	log.Println("  GET  /api/navigation/route")
	log.Println("  GET  /api/bt-areas")
	log.Println("  POST /api/bt-areas")
	log.Println("  PUT  /api/bt-areas/{id}")
	log.Println("  GET  /api/porters")
	log.Println("  PATCH /api/porters/{id}/location")

	if err := http.ListenAndServe(":8081", handler); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
