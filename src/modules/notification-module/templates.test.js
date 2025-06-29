import {
  getNotificationTemplate,
  RIDER_CANCEL_RIDE,
  RIDER_ACCEPT_RIDE,
  RIDE_IMMINENT,
  PROMO,
  RIDE_COMPLETED,
  PAYMENT_SUCCESSFUL,
  PAYMENT_FAILED,
  WELCOME_MESSAGE,
  PASSWORD_RESET_SUCCESS,
  ACCOUNT_BLOCKED,
} from "./templates.js";

describe("Notification Templates", () => {
  describe("getNotificationTemplate", () => {
    it("should return null for an unknown event type", () => {
      const template = getNotificationTemplate("UNKNOWN_EVENT", {});
      expect(template).toBeNull();
    });

    it("should correctly populate RIDER_CANCEL_RIDE template", () => {
      const data = { riderName: "John Doe" };
      const template = getNotificationTemplate(RIDER_CANCEL_RIDE, data);
      expect(template.title).toBe("Ride Cancelled");
      expect(template.body).toBe("Your ride with John Doe has been cancelled.");
    });

    it("should correctly populate RIDER_ACCEPT_RIDE template", () => {
      const data = { riderName: "Jane Smith" };
      const template = getNotificationTemplate(RIDER_ACCEPT_RIDE, data);
      expect(template.title).toBe("Ride Accepted");
      expect(template.body).toBe("Jane Smith has accepted your ride request.");
    });

    it("should correctly populate RIDE_IMMINENT template", () => {
      const data = { riderName: "Driver Tom", time: "5" };
      const template = getNotificationTemplate(RIDE_IMMINENT, data);
      expect(template.title).toBe("Ride Imminent");
      expect(template.body).toBe("Your ride with Driver Tom will arrive in 5 minutes.");
    });

    it("should correctly populate PROMO template", () => {
      const data = { promoCode: "SUMMER20", discount: "20%" };
      const template = getNotificationTemplate(PROMO, data);
      expect(template.title).toBe("New Promo Code!");
      expect(template.body).toBe("Use promo code SUMMER20 to get 20% off your next ride.");
    });

    it("should correctly populate RIDE_COMPLETED template", () => {
      const data = { pickupLocation: "123 Main St", dropoffLocation: "456 Oak Ave", fareAmount: "$15.00" };
      const template = getNotificationTemplate(RIDE_COMPLETED, data);
      expect(template.title).toBe("Ride Completed");
      expect(template.body).toBe("Your ride from 123 Main St to 456 Oak Ave is complete. Total fare: $15.00.");
    });

    it("should correctly populate PAYMENT_SUCCESSFUL template", () => {
      const data = { amount: "$25.50", rideId: "RIDE12345" };
      const template = getNotificationTemplate(PAYMENT_SUCCESSFUL, data);
      expect(template.title).toBe("Payment Successful");
      expect(template.body).toBe("Your payment of $25.50 for ride ID RIDE12345 was successful. Thank you!");
    });

    it("should correctly populate PAYMENT_FAILED template", () => {
      const data = { amount: "$30.00", rideId: "RIDE67890" };
      const template = getNotificationTemplate(PAYMENT_FAILED, data);
      expect(template.title).toBe("Payment Failed");
      expect(template.body).toBe("Your payment of $30.00 for ride ID RIDE67890 failed. Please update your payment method.");
    });

    it("should correctly populate WELCOME_MESSAGE template", () => {
      const data = { userName: "NewUser123" };
      const template = getNotificationTemplate(WELCOME_MESSAGE, data);
      expect(template.title).toBe("Welcome to Our Service!");
      expect(template.body).toBe("Hello NewUser123, welcome aboard! We're excited to have you.");
    });

    it("should correctly populate PASSWORD_RESET_SUCCESS template", () => {
      const template = getNotificationTemplate(PASSWORD_RESET_SUCCESS, {});
      expect(template.title).toBe("Password Reset Successfully");
      expect(template.body).toBe("Your password has been successfully reset. You can now log in with your new password.");
    });

    it("should correctly populate ACCOUNT_BLOCKED template", () => {
      const template = getNotificationTemplate(ACCOUNT_BLOCKED, {});
      expect(template.title).toBe("Account Blocked");
      expect(template.body).toBe("Your account has been blocked due to suspicious activity. Please contact support for assistance.");
    });

    it("should handle missing data by not replacing placeholders", () => {
      const data = {};
      const template = getNotificationTemplate(RIDER_CANCEL_RIDE, data);
      expect(template.title).toBe("Ride Cancelled");
      expect(template.body).toBe("Your ride with {{riderName}} has been cancelled.");
    });

    it("should handle extra data by ignoring it", () => {
      const data = { riderName: "John Doe", extraField: "should be ignored" };
      const template = getNotificationTemplate(RIDER_CANCEL_RIDE, data);
      expect(template.title).toBe("Ride Cancelled");
      expect(template.body).toBe("Your ride with John Doe has been cancelled.");
    });
  });
});
