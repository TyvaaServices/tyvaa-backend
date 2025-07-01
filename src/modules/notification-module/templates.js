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

const templates = {
    [RIDER_CANCEL_RIDE]: {
        en: {
            title: "Ride Cancelled",
            body: "Your ride with {{riderName}} has been cancelled.",
        },
        fr: {
            title: "Course annulée",
            body: "Votre course avec {{riderName}} a été annulée.",
        },
    },
    [RIDER_ACCEPT_RIDE]: {
        en: {
            title: "Ride Accepted",
            body: "{{riderName}} has accepted your ride request.",
        },
        fr: {
            title: "Course acceptée",
            body: "{{riderName}} a accepté votre demande de course.",
        },
    },
    [RIDE_IMMINENT]: {
        en: {
            title: "Ride Imminent",
            body: "Your ride with {{riderName}} will arrive in {{time}} minutes.",
        },
        fr: {
            title: "Course imminente",
            body: "Votre course avec {{riderName}} arrivera dans {{time}} minutes.",
        },
    },
    [PROMO]: {
        en: {
            title: "New Promo Code!",
            body: "Use promo code {{promoCode}} to get {{discount}} off your next ride.",
        },
        fr: {
            title: "Nouveau code promo !",
            body: "Utilisez le code promo {{promoCode}} pour obtenir {{discount}} de réduction sur votre prochaine course.",
        },
    },
    [RIDE_COMPLETED]: {
        en: {
            title: "Ride Completed",
            body: "Your ride from {{pickupLocation}} to {{dropoffLocation}} is complete. Total fare: {{fareAmount}}.",
        },
        fr: {
            title: "Course terminée",
            body: "Votre course de {{pickupLocation}} à {{dropoffLocation}} est terminée. Prix total : {{fareAmount}}.",
        },
    },
    [PAYMENT_SUCCESSFUL]: {
        en: {
            title: "Payment Successful",
            body: "Your payment of {{amount}} for ride ID {{rideId}} was successful. Thank you!",
        },
        fr: {
            title: "Paiement réussi",
            body: "Votre paiement de {{amount}} pour la course ID {{rideId}} a été effectué avec succès. Merci !",
        },
    },
    [PAYMENT_FAILED]: {
        en: {
            title: "Payment Failed",
            body: "Your payment of {{amount}} for ride ID {{rideId}} failed. Please update your payment method.",
        },
        fr: {
            title: "Échec du paiement",
            body: "Votre paiement de {{amount}} pour la course ID {{rideId}} a échoué. Veuillez mettre à jour votre méthode de paiement.",
        },
    },
    [WELCOME_MESSAGE]: {
        en: {
            title: "Welcome to Our Service!",
            body: "Hello {{userName}}, welcome aboard! We're excited to have you.",
        },
        fr: {
            title: "Bienvenue sur notre service !",
            body: "Bonjour {{userName}}, bienvenue à bord ! Nous sommes ravis de vous compter parmi nous.",
        },
    },
    [PASSWORD_RESET_SUCCESS]: {
        en: {
            title: "Password Reset Successfully",
            body: "Your password has been successfully reset. You can now log in with your new password.",
        },
        fr: {
            title: "Réinitialisation du mot de passe réussie",
            body: "Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
        },
    },
    [ACCOUNT_BLOCKED]: {
        en: {
            title: "Account Blocked",
            body: "Your account has been blocked due to suspicious activity. Please contact support for assistance.",
        },
        fr: {
            title: "Compte bloqué",
            body: "Votre compte a été bloqué en raison d'une activité suspecte. Veuillez contacter le support pour obtenir de l'aide.",
        },
    },
};

export function getNotificationTemplate(eventType, data, language = "en") {
    const templateSet = templates[eventType];
    if (!templateSet) {
        return null;
    }
    const template = templateSet[language] || templateSet["en"];
    let title = template.title;
    let body = template.body;
    for (const key in data) {
        const placeholder = `{{${key}}}`;
        title = title.replace(new RegExp(placeholder, "g"), data[key]);
        body = body.replace(new RegExp(placeholder, "g"), data[key]);
    }
    return { title, body };
}
