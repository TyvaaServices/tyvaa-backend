# API Documentation: Ride Publishing

## Overview

This document explains how to publish rides in the Tyvaa backend system. Rides are published as templates (RideModel) and then generate specific instances (RideInstance) for booking.

## Ride Publishing Flow

### 1. Create a Ride Template (Publish Ride)

**Endpoint:** `POST /api/v1/rides`

**Authentication:** Required (Bearer token)

**Request Body:**

```json
{
    "driverId": 1,
    "departure": "MEDINA",
    "destination": "GRAND YOFF",
    "seatsAvailable": 3,
    "recurrence": ["Monday", "Wednesday", "Friday"],
    "comment": "Weekly commute to work",
    "price": 500,
    "startDate": "2025-07-10",
    "endDate": "2025-08-10",
    "time": "08:00:00",
    "isRecurring": true
}
```

**Field Descriptions:**

- `driverId` (integer, required): ID of the driver publishing the ride
- `departure` (string, required): Starting location
- `destination` (string, required): End destination
- `seatsAvailable` (integer, required): Total seats available per instance
- `recurrence` (array of strings, optional): Days of the week for recurring rides
- `comment` (string, optional): Additional notes about the ride
- `price` (integer, required): Price per seat in CFA francs (smallest unit)
- `startDate` (string, optional): Start date for recurring rides (YYYY-MM-DD)
- `endDate` (string, optional): End date for recurring rides (YYYY-MM-DD)
- `time` (string, optional): Departure time (HH:MM:SS)
- `isRecurring` (boolean): Whether this is a recurring ride

**Response (201 Created):**

```json
{
    "id": 1,
    "driverId": 1,
    "departure": "MEDINA",
    "destination": "GRAND YOFF",
    "seatsAvailable": 3,
    "recurrence": ["Monday", "Wednesday", "Friday"],
    "comment": "Weekly commute to work",
    "price": 500,
    "status": "active",
    "startDate": "2025-07-10",
    "endDate": "2025-08-10",
    "time": "08:00:00",
    "isRecurring": true
}
```

### 2. Create Ride Instances

After publishing a ride template, specific instances need to be created for actual booking.

**Endpoint:** `POST /api/v1/ride-instances`

**Request Body:**

```json
{
    "rideId": 1,
    "rideDate": "2025-07-14T08:00:00Z",
    "seatsAvailable": 3,
    "seatsBooked": 0,
    "status": "scheduled"
}
```

**Response (201 Created):**

```json
{
    "id": 1,
    "rideId": 1,
    "rideDate": "2025-07-14T08:00:00Z",
    "seatsAvailable": 3,
    "seatsBooked": 0,
    "status": "scheduled"
}
```

## Error Responses

### 400 Bad Request

```json
{
    "error": "Invalid ride data provided"
}
```

### 401 Unauthorized

```json
{
    "error": "Authentication required"
}
```

### 403 Forbidden

```json
{
    "error": "Insufficient permissions to publish rides"
}
```

## Implementation Notes

1. **Driver Verification**: Ensure the user has driver permissions before allowing ride publishing
2. **Price Validation**: Prices should be in the smallest currency unit (CFA francs)
3. **Date Validation**: Start date should be before end date for recurring rides
4. **Recurrence Logic**: The system automatically generates instances based on recurrence patterns
5. **Status Management**: Rides start with "active" status and can be updated to "cancelled" or "completed"

## Frontend Implementation Example

```javascript
// Publish a new ride
async function publishRide(rideData) {
    try {
        const response = await fetch("/api/v1/rides", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${userToken}`,
            },
            body: JSON.stringify(rideData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const publishedRide = await response.json();
        console.log("Ride published:", publishedRide);
        return publishedRide;
    } catch (error) {
        console.error("Error publishing ride:", error);
        throw error;
    }
}

// Example usage
const rideData = {
    driverId: 1,
    departure: "MEDINA",
    destination: "GRAND YOFF",
    seatsAvailable: 3,
    recurrence: ["Monday", "Wednesday", "Friday"],
    comment: "Weekly commute",
    price: 500,
    startDate: "2025-07-10",
    endDate: "2025-08-10",
    time: "08:00:00",
    isRecurring: true,
};

publishRide(rideData);
```
