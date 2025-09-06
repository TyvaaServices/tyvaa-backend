# DEXCHANGE Payment Integration - Implementation Guide

## Overview

Successfully integrated DEXCHANGE API for West African mobile money payments (Orange Money, Wave, MTN Money, Moov Money)
across Senegal, Mali, Ivory Coast, and Cameroon.

## Files Created/Modified

### Core DEXCHANGE Files

1. **`src/modules/payment-module/dexchange/dexchangeService.js`**
    - Core DEXCHANGE API service
    - Handles API communication, phone number normalization, error handling
    - Supports all DEXCHANGE operations (initialize, status check, services, balance)

2. **`src/modules/payment-module/dexchange/dexchangeAdapter.js`**
    - Payment provider adapter pattern
    - Standardizes DEXCHANGE responses with your payment system
    - Handles webhook processing and status mapping

3. **`src/modules/payment-module/dexchange/controllers/dexchangeController.js`**
    - HTTP endpoint handlers for DEXCHANGE operations
    - Input validation and error handling
    - Swagger documentation schemas

4. **`src/modules/payment-module/dexchange/routes/dexchangeRoutes.js`**
    - Route definitions with comprehensive Swagger schemas
    - Endpoints: `/methods`, `/initialize`, `/status`, `/webhook`, `/balance`, `/services`

### Enhanced Core Files

5. **`src/modules/payment-module/models/payment.js`** ✅ Enhanced
    - Added fields: `externalTransactionId`, `fee`, `provider`, `paymentUrl`
    - Enhanced validation, indexes, and instance methods
    - Support for multiple payment providers

6. **`src/modules/payment-module/services/paymentService.js`** ✅ Enhanced
    - Multi-provider payment service architecture
    - DEXCHANGE integration with webhook processing
    - Comprehensive payment lifecycle management

7. **`src/modules/payment-module/routes/paymentRouter.js`** ✅ Enhanced
    - Added DEXCHANGE routes under `/dexchange` prefix
    - General payment endpoints for cross-provider operations

### Database & Configuration

8. **`migrations/20250905_update_payments_for_dexchange.js`**
    - Database migration for enhanced payment model
    - Adds new columns and indexes for DEXCHANGE support

9. **`.env.dexchange.example`**
    - Environment configuration template
    - Required DEXCHANGE API credentials and settings

## API Endpoints

### DEXCHANGE Specific Endpoints

```
GET    /api/v1/payments/dexchange/methods/:country     - Get payment methods
POST   /api/v1/payments/dexchange/initialize          - Initialize payment
GET    /api/v1/payments/dexchange/status/:transactionId - Check payment status
POST   /api/v1/payments/dexchange/webhook              - Handle webhooks
GET    /api/v1/payments/dexchange/balance              - Get account balance
GET    /api/v1/payments/dexchange/services             - Get all services
```

### General Payment Endpoints

```
GET    /api/v1/payments/methods/:country               - Get payment methods
POST   /api/v1/payments/initialize                     - Initialize payment
GET    /api/v1/payments/status/:transactionId          - Check payment status
GET    /api/v1/payments/booking/:bookingId             - Get payments by booking
POST   /api/v1/payments/notify                         - Legacy notification endpoint
```

## Configuration Required

### Environment Variables

Add to your `.env` file:

```env
DEXCHANGE_BASE_URL=https://api-m.dexchange.sn/api/v1
DEXCHANGE_API_KEY=your_api_key_here
DEXCHANGE_WEBHOOK_SECRET=your_webhook_secret
DEFAULT_PAYMENT_PROVIDER=dexchange
DEFAULT_COUNTRY=SN
DEFAULT_CURRENCY=XOF
PAYMENT_WEBHOOK_BASE_URL=https://your-domain.com/api/v1/payments
PAYMENT_RETURN_BASE_URL=https://your-domain.com/payment
```

### Database Migration

Run the migration to update your payment table:

```bash
# Using your migration system
npm run migrate
```

## Supported Countries & Payment Methods

### Senegal (SN)

- Orange Money (`orange`)
- Wave (`wave`)
- Free Money (`free`)
- Wizall Money (`wizall`)

### Mali (ML)

- Orange Money (`orange`)
- Moov Money (`moov`)
- Wave (`wave`)

### Ivory Coast (CI)

- Orange Money (`orange`)
- Wave (`wave`)
- MTN Money (`mtn`)
- Moov Money (`moov`)

### Cameroon (CM)

- Orange Money (`orange`)
- MTN Money (`mtn`)

## Usage Examples

### Initialize Payment

```javascript
const paymentData = {
    bookingId: 123,
    amount: 5000,
    phoneNumber: "771234567",
    paymentMethod: "orange",
    country: "SN",
    provider: "dexchange",
    callbackUrl: "https://your-domain.com/api/v1/payments/dexchange/webhook",
    returnUrl: "https://your-domain.com/payment/result"
};

const result = await paymentService.createPayment(paymentData);
```

### Check Payment Status

```javascript
const status = await paymentService.checkPaymentStatus(transactionId, "dexchange");
```

### Process Webhook

```javascript
const result = await paymentService.processWebhook("dexchange", webhookData, signature);
```

## Key Features

### ✅ Multi-Provider Architecture

- Easy to add new payment providers
- Standardized payment interface
- Provider-specific adapters

### ✅ Comprehensive Error Handling

- API error mapping to user-friendly messages
- Webhook signature verification
- Input validation and sanitization

### ✅ Phone Number Normalization

- Automatic country code handling
- West African number format support
- 9-digit DEXCHANGE format conversion

### ✅ Payment Lifecycle Management

- Status tracking and updates
- Webhook processing
- Final state protection

### ✅ Security & Monitoring

- Request/response logging
- Webhook signature verification
- Sensitive data masking

### ✅ Database Optimization

- Proper indexing for performance
- JSON metadata storage
- Payment history tracking

## Next Steps

1. **Configure Environment**: Copy `.env.dexchange.example` and set your API credentials
2. **Run Migration**: Execute the database migration
3. **Test Integration**: Use the provided endpoints to test payments
4. **Monitor Webhooks**: Ensure webhook URL is accessible and properly configured
5. **Production Deployment**: Update production environment with DEXCHANGE credentials

## Testing

Test with DEXCHANGE sandbox/staging environment first:

- Use test phone numbers
- Verify webhook delivery
- Test all payment methods for your target countries
- Validate error handling scenarios

The integration is now complete and ready for testing!
