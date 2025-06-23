async function sendOtpEmail(email, otp, transporter, logger) {
    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM || "no-reply@tyvaa.live",
            to: email,
            subject: "Your Tyvaa Admin OTP",
            text: `Your OTP is: ${otp}`,
            html: `<p>Your OTP is: <b>${otp}</b></p>`,
        });
        logger.info(`Sent OTP ${otp} to ${email}`);
    } catch (err) {
        logger.error(`Failed to send OTP email to ${email}: ${err.message}`);
        throw err;
    }
}
export default sendOtpEmail;