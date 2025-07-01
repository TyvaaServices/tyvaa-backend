import nodemailer from "nodemailer";
import createLogger from "./logger.js";

const logger = createLogger("mailer-utility");

/**
 * @file Configures and exports a Nodemailer transporter instance for sending emails.
 * It relies on SMTP configuration from environment variables:
 * - SMTP_HOST: Hostname of the SMTP server.
 * - SMTP_PORT: Port of the SMTP server (defaults to 465 for secure, 587 for non-secure).
 * - SMTP_USER: Username for SMTP authentication.
 * - SMTP_PASS: Password for SMTP authentication.
 * - SMTP_SECURE: ('true' or 'false') Whether to use a secure connection (TLS/SSL). Defaults based on port.
 * - SMTP_FROM_EMAIL: Default "from" address for emails (e.g., "MyApp <no-reply@example.com>").
 */

let transporterInstance = null;

try {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecureEnv = process.env.SMTP_SECURE?.toLowerCase();
    const smtpPortEnv = process.env.SMTP_PORT;

    if (!smtpHost || !smtpUser || !smtpPass) {
        logger.warn(
            "SMTP configuration (SMTP_HOST, SMTP_USER, SMTP_PASS) is incomplete. " +
                "Email functionality will be disabled. Check environment variables."
        );
    } else {
        let secureConnection;
        let smtpPort;

        if (smtpSecureEnv === "true") {
            secureConnection = true;
            smtpPort = parseInt(smtpPortEnv || "465", 10); // Default to 465 for secure
        } else if (smtpSecureEnv === "false") {
            secureConnection = false;
            smtpPort = parseInt(smtpPortEnv || "587", 10); // Default to 587 for non-secure
        } else {
            // SMTP_SECURE not explicitly set, infer from port
            smtpPort = parseInt(smtpPortEnv || "465", 10); // Assume secure by default if not specified
            secureConnection = smtpPort === 465;
        }

        transporterInstance = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: secureConnection,
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        transporterInstance.verify((error) => {
            if (error) {
                logger.error(
                    { error },
                    "Nodemailer transporter verification failed. Emails may not send."
                );
                transporterInstance = null;
            } else {
                logger.info(
                    "Nodemailer transporter configured and verified successfully. Ready to send emails."
                );
            }
        });
    }
} catch (error) {
    logger.error(
        { error },
        "Critical error during Nodemailer transporter setup. Email functionality disabled."
    );
    transporterInstance = null;
}

/**
 * The configured Nodemailer transporter instance.
 * This will be `null` if SMTP environment variables are not properly configured
 * or if transporter verification fails.
 * Functions using this transporter should check for its existence before attempting to send mail.
 * @type {import("nodemailer").Transporter | null}
 */
export default transporterInstance;
