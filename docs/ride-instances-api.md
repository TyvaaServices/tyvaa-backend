# API Documentation: Querying Ride Instances

## Overview

This document explains how to query ride instances for passengers to find and book available rides. Ride instances represent specific occurrences of published rides that can be booked.

## Available Endpoints

### 1. Get All Ride Instances

**Endpoint:** `GET /api/v1/ride-instances`

**Authentication:** Required (Bearer token)

**Query Parameters:** None

**Response (200 OK):**

```json
[
    {
        "id": 1,
        "rideId": 1,
        "rideDate": "2025-07-14T08:00:00Z",
        "seatsAvailable": 3,
        "seatsBooked": 1,
        "status": "scheduled",
        "RideModel": {
            "id": 1,
            "driverId": 1,
            "departure": "MEDINA",
            "destination": "GRAND YOFF",
            "price": 500,
            "comment": "Weekly commute"
        }
    },
    {
        "id": 2,
        "rideId": 1,
        "rideDate": "2025-07-16T08:00:00Z",
        "seatsAvailable": 3,
        "seatsBooked": 0,
        "status": "scheduled",
        "RideModel": {
            "id": 1,
            "driverId": 1,
            "departure": "MEDINA",
            "destination": "GRAND YOFF",
            "price": 500,
            "comment": "Weekly commute"
        }
    }
]
```

### 2. Get Available Rides (Optimized for Passengers)

**Endpoint:** `GET /api/v1/rides/available`

**Authentication:** Required (Bearer token)

**Description:** Returns only ride instances that are available for booking (not full, not in the past)

**Response (200 OK):**

```json
[
    {
        "id": 2,
        "rideId": 1,
        "rideDate": "2025-07-16T08:00:00Z",
        "seatsAvailable": 3,
        "seatsBooked": 0,
        "status": "scheduled",
        "availableSeats": 3,
        "RideModel": {
            "id": 1,
            "driverId": 1,
            "departure": "MEDINA",
            "destination": "GRAND YOFF",
            "price": 500,
            "comment": "Weekly commute",
            "DriverProfile": {
                "id": 1,
                "driverNote": 4.5,
                "User": {
                    "id": 1,
                    "fullName": "John Doe",
                    "profileImage": "https://example.com/profile.jpg"
                }
            }
        }
    }
]
```

### 3. Get Specific Ride Instance

**Endpoint:** `GET /api/v1/ride-instances/{id}`

**Authentication:** Required (Bearer token)

**Path Parameters:**

- `id` (integer): The ID of the ride instance

**Response (200 OK):**

```json
{
    "id": 1,
    "rideId": 1,
    "rideDate": "2025-07-14T08:00:00Z",
    "seatsAvailable": 3,
    "seatsBooked": 1,
    "status": "scheduled",
    "RideModel": {
        "id": 1,
        "driverId": 1,
        "departure": "MEDINA",
        "destination": "GRAND YOFF",
        "price": 500,
        "comment": "Weekly commute",
        "DriverProfile": {
            "id": 1,
            "driverNote": 4.5,
            "User": {
                "id": 1,
                "fullName": "John Doe",
                "profileImage": "https://example.com/profile.jpg"
            }
        }
    },
    "Bookings": [
        {
            "id": 1,
            "seatsBooked": 1,
            "status": "booked",
            "PassengerProfile": {
                "User": {
                    "fullName": "Jane Smith"
                }
            }
        }
    ]
}
```

### 4. Search Rides with Filters

**Endpoint:** `GET /api/v1/rides/search`

**Authentication:** Required (Bearer token)

**Query Parameters:**

- `departure` (string, optional): Filter by departure location
- `destination` (string, optional): Filter by destination
- `date` (string, optional): Filter by date (YYYY-MM-DD)
- `minSeats` (integer, optional): Minimum available seats needed
- `maxPrice` (integer, optional): Maximum price per seat

**Example:** `GET /api/v1/rides/search?departure=MEDINA&destination=GRAND%20YOFF&date=2025-07-16&minSeats=2`

**Response (200 OK):**

```json
[
    {
        "id": 2,
        "rideId": 1,
        "rideDate": "2025-07-16T08:00:00Z",
        "seatsAvailable": 3,
        "seatsBooked": 0,
        "availableSeats": 3,
        "RideModel": {
            "departure": "MEDINA",
            "destination": "GRAND YOFF",
            "price": 500
        }
    }
]
```

## Response Field Descriptions

### RideInstance Fields

- `id`: Unique identifier for the ride instance
- `rideId`: Reference to the parent ride template
- `rideDate`: Date and time of the ride departure
- `seatsAvailable`: Total seats in the vehicle
- `seatsBooked`: Number of seats already booked
- `status`: Current status ("scheduled", "in_progress", "completed", "cancelled")
- `availableSeats`: Calculated field (seatsAvailable - seatsBooked)

### RideModel Fields (Parent Ride Template)

- `departure`: Starting location
- `destination`: End destination
- `price`: Price per seat in CFA francs
- `comment`: Driver's notes about the ride

## Error Responses

### 404 Not Found

```json
{
    "error": "Ride instance not found"
}
```

### 401 Unauthorized

```json
{
    "error": "Authentication required"
}
```

## Frontend Implementation Examples

### 1. Get All Available Rides

```javascript
async function getAvailableRides() {
    try {
        const response = await fetch("/api/v1/rides/available", {
            headers: {
                Authorization: `Bearer ${userToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rides = await response.json();
        return rides;
    } catch (error) {
        console.error("Error fetching available rides:", error);
        throw error;
    }
}
```

### 2. Search Rides with Filters

```javascript
async function searchRides(filters) {
    const queryParams = new URLSearchParams();

    if (filters.departure) queryParams.append("departure", filters.departure);
    if (filters.destination)
        queryParams.append("destination", filters.destination);
    if (filters.date) queryParams.append("date", filters.date);
    if (filters.minSeats) queryParams.append("minSeats", filters.minSeats);
    if (filters.maxPrice) queryParams.append("maxPrice", filters.maxPrice);

    try {
        const response = await fetch(`/api/v1/rides/search?${queryParams}`, {
            headers: {
                Authorization: `Bearer ${userToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rides = await response.json();
        return rides;
    } catch (error) {
        console.error("Error searching rides:", error);
        throw error;
    }
}

// Example usage
const filters = {
    departure: "MEDINA",
    destination: "GRAND YOFF",
    date: "2025-07-16",
    minSeats: 2,
};

searchRides(filters).then((rides) => {
    console.log("Found rides:", rides);
});
```

### 3. Get Specific Ride Details

```javascript
async function getRideDetails(rideInstanceId) {
    try {
        const response = await fetch(
            `/api/v1/ride-instances/${rideInstanceId}`,
            {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rideDetails = await response.json();
        return rideDetails;
    } catch (error) {
        console.error("Error fetching ride details:", error);
        throw error;
    }
}
```

### 4. Display Rides in UI

```javascript
function displayRides(rides) {
    const ridesContainer = document.getElementById("rides-container");

    rides.forEach((ride) => {
        const rideElement = document.createElement("div");
        rideElement.className = "ride-card";

        const availableSeats = ride.seatsAvailable - ride.seatsBooked;
        const departureTime = new Date(ride.rideDate).toLocaleString();

        rideElement.innerHTML = `
      <div class="ride-info">
        <h3>${ride.RideModel.departure} → ${ride.RideModel.destination}</h3>
        <p>Date: ${departureTime}</p>
        <p>Price: ${ride.RideModel.price} CFA</p>
        <p>Available seats: ${availableSeats}</p>
        <p>Driver: ${ride.RideModel.DriverProfile?.User?.fullName || "N/A"}</p>
        ${ride.RideModel.comment ? `<p>Note: ${ride.RideModel.comment}</p>` : ""}
      </div>
      <button onclick="bookRide(${ride.id})" ${availableSeats === 0 ? "disabled" : ""}>
        ${availableSeats === 0 ? "Full" : "Book Ride"}
      </button>
    `;

        ridesContainer.appendChild(rideElement);
    });
}
```

## Best Practices

1. **Caching**: Cache available rides for a short period (1-2 minutes) to reduce server load
2. **Real-time Updates**: Consider implementing WebSocket connections for real-time seat availability updates
3. **Pagination**: For large datasets, implement pagination using query parameters like `page` and `limit`
4. **Loading States**: Always show loading indicators while fetching ride data
5. **Error Handling**: Implement proper error handling for network failures and empty results
