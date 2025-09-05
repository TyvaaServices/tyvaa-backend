// Simple test to verify booking creation works without foreign key constraint
import { Booking } from './src/config/index.js';

async function testBookingCreation() {
    try {
        console.log('Testing booking creation...');
        
        const testBooking = await Booking.create({
            userId: 1,
            rideInstanceId: 1,
            seatsBooked: 1,
            status: 'booked'
        });
        
        console.log('✅ Booking created successfully:', testBooking.toJSON());
        
        // Clean up - delete the test booking
        await testBooking.destroy();
        console.log('🧹 Test booking cleaned up');
        
    } catch (error) {
        console.error('❌ Booking creation failed:', error.message);
    }
}

testBookingCreation();
