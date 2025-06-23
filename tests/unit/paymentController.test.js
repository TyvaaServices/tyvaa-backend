// tests/unit/paymentController.test.js
import { jest } from '@jest/globals';
import paymentController from '../../src/modules/payment-module/controllers/paymentController.js';
import Payment from '../../src/modules/payment-module/models/payment.js';

// Define the mock function instance *before* jest.mock uses it in its factory.
const mockGeneratePaymentLinkFn = jest.fn();

// Mock models
jest.mock('../../src/modules/payment-module/models/payment.js');

// Mock the service module with a factory, ensuring ESM compatibility
jest.mock('../../src/modules/payment-module/services/paymentService.js', () => ({
    __esModule: true, // Important for ESM named export mocking
    generatePaymentLink: mockGeneratePaymentLinkFn, // Use the pre-defined mock function
}));

// NOTE: We do NOT import `generatePaymentLink` here in the test file directly for mocking.
// `paymentController` will import it, and it should get `mockGeneratePaymentLinkFn`.
// We will use `mockGeneratePaymentLinkFn` directly in our tests.

describe('Payment Controller', () => {
    let mockRequest;
    let mockReply;

    beforeEach(() => {
        mockRequest = {
            params: {},
            body: {},
        };
        mockReply = {
            send: jest.fn().mockReturnThis(),
            code: jest.fn().mockReturnThis(),
        };

        // Reset mocks for Payment model methods by re-assigning them
        Payment.create = jest.fn();
        Payment.findByPk = jest.fn();
        Payment.findAll = jest.fn();

        // Clear the shared mock function instance before each test.
        mockGeneratePaymentLinkFn.mockClear();
    });

    describe('createPayment', () => {
        it('should create a payment successfully', async () => {
            const requestBody = { phone: '1234567890', amount: 100, bookingId: 'b1' };
            const mockPaymentLink = 'http://pay.me/link';
            const createdPayment = { id: 'p1', ...requestBody, status: 'pending', paymentLink: mockPaymentLink };

            mockRequest.body = requestBody;
            mockGeneratePaymentLinkFn.mockReturnValue(mockPaymentLink);
            Payment.create.mockResolvedValue(createdPayment);

            await paymentController.createPayment(mockRequest, mockReply);

            expect(mockGeneratePaymentLinkFn).toHaveBeenCalledWith({ amount: requestBody.amount });
            expect(Payment.create).toHaveBeenCalledWith({
                phone: requestBody.phone,
                amount: requestBody.amount,
                status: 'pending',
                paymentLink: mockPaymentLink,
                bookingId: requestBody.bookingId,
            });
            expect(mockReply.code).toHaveBeenCalledWith(201);
            expect(mockReply.send).toHaveBeenCalledWith(createdPayment);
        });

        it('should return 400 if Payment.create throws error', async () => {
            mockRequest.body = { phone: '1234567890', amount: 100, bookingId: 'b1' };
            mockGeneratePaymentLinkFn.mockReturnValue('http://pay.me/link');
            Payment.create.mockRejectedValue(new Error('DB creation failed'));

            await paymentController.createPayment(mockRequest, mockReply);

            expect(mockReply.code).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'DB creation failed' });
        });

         it('should return 400 if generatePaymentLink throws error', async () => {
            mockRequest.body = { phone: '1234567890', amount: 100, bookingId: 'b1' };
            mockGeneratePaymentLinkFn.mockImplementation(() => { throw new Error('Link generation failed'); });

            await paymentController.createPayment(mockRequest, mockReply);

            expect(mockReply.code).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Link generation failed' });
        });
    });

    describe('getPayment', () => {
        it('should return a payment by ID successfully', async () => {
            const paymentId = 'p1';
            const mockPayment = { id: paymentId, amount: 100, status: 'completed' };
            mockRequest.params.id = paymentId;
            Payment.findByPk.mockResolvedValue(mockPayment);

            await paymentController.getPayment(mockRequest, mockReply);

            expect(Payment.findByPk).toHaveBeenCalledWith(paymentId);
            expect(mockReply.send).toHaveBeenCalledWith(mockPayment);
        });

        it('should return 404 if payment not found', async () => {
            mockRequest.params.id = 'p1';
            Payment.findByPk.mockResolvedValue(null);

            await paymentController.getPayment(mockRequest, mockReply);

            expect(mockReply.code).toHaveBeenCalledWith(404);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'Payment not found' });
        });

        it('should return 400 if Payment.findByPk throws error', async () => {
            mockRequest.params.id = 'p1';
            Payment.findByPk.mockRejectedValue(new Error('DB find failed'));

            await paymentController.getPayment(mockRequest, mockReply);

            expect(mockReply.code).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'DB find failed' });
        });
    });

    describe('getAllPayment', () => {
        it('should return all payments successfully', async () => {
            const mockPayments = [
                { id: 'p1', amount: 100, status: 'completed' },
                { id: 'p2', amount: 200, status: 'pending' },
            ];
            Payment.findAll.mockResolvedValue(mockPayments);

            await paymentController.getAllPayment(mockRequest, mockReply);

            expect(Payment.findAll).toHaveBeenCalled();
            expect(mockReply.send).toHaveBeenCalledWith(mockPayments);
        });

        it('should return 400 if Payment.findAll throws error', async () => {
            Payment.findAll.mockRejectedValue(new Error('DB findAll failed'));

            await paymentController.getAllPayment(mockRequest, mockReply);

            expect(mockReply.code).toHaveBeenCalledWith(400);
            expect(mockReply.send).toHaveBeenCalledWith({ error: 'DB findAll failed' });
        });
    });
});
