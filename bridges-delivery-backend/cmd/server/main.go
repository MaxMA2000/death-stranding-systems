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
	hub := websocket.NewHub()
	go hub.Run()

	// Initialize handlers
	orderHandler := handlers.NewOrderHandler(store, hub)

	// Setup routes
	router := mux.NewRouter()

	// API routes
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/orders", orderHandler.CreateOrder).Methods("POST")
	api.HandleFunc("/orders", orderHandler.GetOrders).Methods("GET")
	api.HandleFunc("/orders/{id}", orderHandler.GetOrder).Methods("GET")
	api.HandleFunc("/orders/{id}/status", orderHandler.UpdateOrderStatus).Methods("PATCH")
	api.HandleFunc("/porters/{id}/orders", orderHandler.GetPorterOrders).Methods("GET")

	// WebSocket route
	router.HandleFunc("/ws", hub.HandleWebSocket)

	// Health check
	router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	}).Methods("GET")

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:3001"}, // Frontend URLs
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := c.Handler(router)

	log.Println("Bridges Backend Server starting on :8081")
	log.Println("WebSocket endpoint: ws://localhost:8081/ws")
	log.Println("API endpoint: http://localhost:8081/api")

	if err := http.ListenAndServe(":8081", handler); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
