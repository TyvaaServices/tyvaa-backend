import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockFindOne = jest.fn();
const mockSave = jest.fn();
const mockCreate = jest.fn();

jest.unstable_mockModule(
    "../../src/modules/payment-module/models/payment.js",
    () => ({
        __esModule: true,
        default: {
            findOne: mockFindOne,
            create: mockCreate,
        },
    })
);

describe("paymentService", () => {
    let paymentService;
    beforeEach(async () => {
        jest.resetModules();
        jest.spyOn(console, "error").mockImplementation(() => {});
        paymentService = (
            await import(
                "../../src/modules/payment-module/services/paymentService.js"
            )
        ).default;
        mockFindOne.mockReset();
        mockSave.mockReset();
        mockCreate.mockReset();
    });
    afterEach(() => {
        console.error.mockRestore();
    });

    describe("updateTransactionStatus", () => {
        const basePayment = {
            status: "PENDING",
            save: mockSave,
        };
        const validData = {
            transaction_id: "tx1",
            status: "SUCCESS",
            amount: 100,
            currency: "USD",
            payment_method: "card",
            metadata: {},
            operator_id: "op1",
        };

        it("updates and returns payment if found and status valid", async () => {
            mockFindOne.mockResolvedValue({ ...basePayment });
            mockSave.mockResolvedValue();
            const result =
                await paymentService.updateTransactionStatus(validData);
            expect(mockFindOne).toHaveBeenCalledWith({
                where: { transaction_id: "tx1" },
            });
            expect(mockSave).toHaveBeenCalled();
            expect(result.status).toBe("SUCCESS");
        });

        it("throws if payment not found", async () => {
            mockFindOne.mockResolvedValue(null);
            await expect(
                paymentService.updateTransactionStatus(validData)
            ).rejects.toThrow(/Payment not found/);
        });

        it("throws if payment already SUCCESS", async () => {
            mockFindOne.mockResolvedValue({
                ...basePayment,
                status: "SUCCESS",
            });
            await expect(
                paymentService.updateTransactionStatus(validData)
            ).rejects.toThrow(/already processed as SUCCESS/);
        });

        it("throws if payment already FAILED", async () => {
            mockFindOne.mockResolvedValue({ ...basePayment, status: "FAILED" });
            await expect(
                paymentService.updateTransactionStatus(validData)
            ).rejects.toThrow(/already processed as FAILED/);
        });

        it("throws if status is invalid", async () => {
            mockFindOne.mockResolvedValue({ ...basePayment });
            await expect(
                paymentService.updateTransactionStatus({
                    ...validData,
                    status: "FOO",
                })
            ).rejects.toThrow(/Invalid status provided/);
        });
    });

    describe("createPayment", () => {
        it("calls create and returns payment", async () => {
            const payment = { id: 1 };
            mockCreate.mockResolvedValue(payment);
            const result = await paymentService.createPayment({ foo: "bar" });
            expect(mockCreate).toHaveBeenCalledWith({ foo: "bar" });
            expect(result).toBe(payment);
        });

        it("throws if create fails", async () => {
            mockCreate.mockRejectedValue(new Error("fail"));
            await expect(
                paymentService.createPayment({ foo: "bar" })
            ).rejects.toThrow("fail");
        });
    });
});
