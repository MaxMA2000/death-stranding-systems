# Death Stranding Delivery System

A full-stack application simulating the complex logistics and delivery network of the "Bridges" company from the video game *Death Stranding*. This project is a system design exploration for a YouTube/Bilibili/Red video.

## Project Concept

In the post-apocalyptic world of Death Stranding, humanity survives in isolated underground cities. Porters, like the protagonist Sam Bridges, are the lifeline, delivering essential goods across a hazardous landscape. This project aims to build the backend system and user-facing applications that would power such a network.

The core idea is to design and implement a system that allows:
1.  **Customers** in isolated "Knot Cities" to place orders for goods.
2.  **Porters** to receive, manage, and navigate these delivery missions.
3.  The **"Bridges" organization** to efficiently manage orders, dispatch porters, and provide safe navigation routes through a world plagued by supernatural threats ("BTs") and environmental hazards ("Timefall").

## System Architecture

The project consists of three main components:

```mermaid
graph TD
    subgraph "Clients"
        A[Customer Terminal<br/>(Next.js)]
        B[Porter Terminal<br/>(Next.js)]
    end

    subgraph "Bridges Corp. Network"
        C[Bridges Backend<br/>(Go)]
    end

    subgraph "External Systems"
        D[Map Provider]
        E[Weather System]
    end

    A -- "Places Order (HTTP/gRPC)" --> C
    C -- "Dispatches Order (WebSocket/gRPC)" --> B
    B -- "Requests Map Data" --> C
    C -- "Calculates Route" --> C
    C -- "Fetches Base Map" --> D
    C -- "Gets Hazard Data" --> E
    C -- "Sends Map & Route Data" --> B
```

*   **Customer Frontend (Next.js):** A web application where users can place delivery orders. This simulates the terminal inside a Knot City. Key order details include sender/recipient info, item details, and pickup preferences.
*   **Porter Frontend (Next.js):** A mobile-first web application for porters. It receives assigned orders, displays mission details, and features an interactive map for navigation.
*   **Bridges Backend (Go):** The central nervous system of the operation. Its responsibilities include:
    *   **Order Management:** Receiving, processing, and storing orders.
    *   **Porter Dispatching:** Assigning new orders to available porters based on a load-balancing algorithm (e.g., assigning to the porter with the fewest active deliveries).
    *   **Mapping & Navigation:**
        *   Integrating with a map provider for base map tiles.
        *   Overlaying pickup/delivery markers.
        *   Calculating the safest and most efficient route using a pathfinding algorithm (like A*).
    *   **Dynamic Rerouting:** Ingesting real-time data from a hypothetical "Weather System" to identify and route around hazardous areas like Timefall or BT zones.

## Core Features

*   **Order Lifecycle Management:** From placement to completion.
*   **Smart Porter Assignment:** Basic load balancing for dispatching.
*   **Advanced Navigation System:**
    *   A* pathfinding algorithm.
    *   Weighted map nodes to represent danger levels (e.g., Safe Zones, Timefall Danger Zones, BT No-Go Zones).
    *   Dynamic route recalculation in response to changing environmental conditions.

## Technology Stack

*   **Backend:** Go (Golang)
*   **Frontends:** Next.js, React, TypeScript
*   **API Communication:** REST/JSON or gRPC (to be decided). WebSockets for real-time updates to the Porter terminal.
*   **Database:** PostgreSQL with PostGIS for geospatial data.
*   **Mapping:** Leaflet or Mapbox for map rendering.
