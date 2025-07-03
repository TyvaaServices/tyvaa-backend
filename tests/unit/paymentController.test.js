import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockUpdateTransactionStatus = jest.fn();
const mockLoggerError = jest.fn();

jest.unstable_mockModule(
    "../../src/modules/payment-module/services/paymentService.js",
    () => ({
        __esModule: true,
        default: { updateTransactionStatus: mockUpdateTransactionStatus },
    })
);
jest.unstable_mockModule("../../src/utils/logger.js", () => ({
    __esModule: true,
    default: () => ({ error: mockLoggerError }),
}));

const validPayload = {
    transaction_id: "tx1",
    status: "SUCCESS",
    amount: 100,
    currency: "USD",
    payment_method: "card",
    metadata: "{}", // must be a string
    operator_id: "op1",
    description: "test payment",
    payment_date: new Date().toISOString(),
};

describe("paymentController.notify", () => {
    let paymentController;
    let req;
    let res;

    beforeEach(async () => {
        jest.resetModules();
        paymentController = (
            await import(
                "../../src/modules/payment-module/controllers/paymentController.js"
            )
        ).default;
        req = { body: { ...validPayload } };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
        };
        mockUpdateTransactionStatus.mockReset();
        mockLoggerError.mockReset();
    });

    it("returns 400 for invalid payload", async () => {
        req.body = { foo: "bar" };
        await paymentController.notify(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.any(String) })
        );
    });

    it("calls updateTransactionStatus and returns 200 for valid payload", async () => {
        mockUpdateTransactionStatus.mockResolvedValue({});
        await paymentController.notify(req, res);
        expect(mockUpdateTransactionStatus).toHaveBeenCalledWith(validPayload);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith("OK");
    });

    it("returns 500 and logs error if updateTransactionStatus throws", async () => {
        mockUpdateTransactionStatus.mockRejectedValue(new Error("fail"));
        await paymentController.notify(req, res);
        expect(mockLoggerError).toHaveBeenCalledWith(
            "Error updating transaction status",
            expect.any(Error)
        );
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith("Internal Server Error");
    });
});
