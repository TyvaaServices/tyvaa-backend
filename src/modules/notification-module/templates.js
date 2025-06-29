// Notification Event Types
export const RIDER_CANCEL_RIDE = "RIDER_CANCEL_RIDE";
export const RIDER_ACCEPT_RIDE = "RIDER_ACCEPT_RIDE";
export const RIDE_IMMINENT = "RIDE_IMMINENT";
export const PROMO = "PROMO";
export const RIDE_COMPLETED = "RIDE_COMPLETED";
export const PAYMENT_SUCCESSFUL = "PAYMENT_SUCCESSFUL";
export const PAYMENT_FAILED = "PAYMENT_FAILED";
export const WELCOME_MESSAGE = "WELCOME_MESSAGE";
export const PASSWORD_RESET_SUCCESS = "PASSWORD_RESET_SUCCESS";
export const ACCOUNT_BLOCKED = "ACCOUNT_BLOCKED";

// Notification Templates
const templates = {
    [RIDER_CANCEL_RIDE]: {
        title: "Ride Cancelled",
        body: "Your ride with {{riderName}} has been cancelled.",
    },
    [RIDER_ACCEPT_RIDE]: {
        title: "Ride Accepted",
        body: "{{riderName}} has accepted your ride request.",
    },
    [RIDE_IMMINENT]: {
        title: "Ride Imminent",
        body: "Your ride with {{riderName}} will arrive in {{time}} minutes.",
    },
    [PROMO]: {
        title: "New Promo Code!",
        body: "Use promo code {{promoCode}} to get {{discount}} off your next ride.",
    },
    [RIDE_COMPLETED]: {
        title: "Ride Completed",
        body: "Your ride from {{pickupLocation}} to {{dropoffLocation}} is complete. Total fare: {{fareAmount}}.",
    },
    [PAYMENT_SUCCESSFUL]: {
        title: "Payment Successful",
        body: "Your payment of {{amount}} for ride ID {{rideId}} was successful. Thank you!",
    },
    [PAYMENT_FAILED]: {
        title: "Payment Failed",
        body: "Your payment of {{amount}} for ride ID {{rideId}} failed. Please update your payment method.",
    },
    [WELCOME_MESSAGE]: {
        title: "Welcome to Our Service!",
        body: "Hello {{userName}}, welcome aboard! We're excited to have you.",
    },
    [PASSWORD_RESET_SUCCESS]: {
        title: "Password Reset Successfully",
        body: "Your password has been successfully reset. You can now log in with your new password.",
    },
    [ACCOUNT_BLOCKED]: {
        title: "Account Blocked",
        body: "Your account has been blocked due to suspicious activity. Please contact support for assistance.",
    },
};

export function getNotificationTemplate(eventType, data) {
    const template = templates[eventType];
    if (!template) {
        return null; // Or throw an error
    }

    let title = template.title;
    let body = template.body;

    for (const key in data) {
        const placeholder = `{{${key}}}`;
        title = title.replace(new RegExp(placeholder, "g"), data[key]);
        body = body.replace(new RegExp(placeholder, "g"), data[key]);
    }

    return { title, body };
}
