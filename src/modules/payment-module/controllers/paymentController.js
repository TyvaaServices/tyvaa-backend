import { paymentResponseSchema } from "../validations/paymentResponse.schema.js";
import paymentService from "./../services/paymentService.js";
import createLogger from "#utils/logger.js";

const logger = createLogger("paymentController");
const paymentController = {
    notify: async (req, res) => {
        const parseResult = paymentResponseSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                error: "Invalid webhook payload",
                details: parseResult.error.errors,
            });
        }
        try {
            await paymentService.updateTransactionStatus(parseResult.data);
        } catch (e) {
            logger.error("Error updating transaction status", e);
            return res.status(500).send("Internal Server Error");
        }
        res.status(200).send("OK");
    },
};
export default paymentController;
