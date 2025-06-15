const Payment = require('../models/payment');
const { generatePaymentLink } = require('../services/paymentService');

exports.createPayment = async (req, reply) => {
    try {
        const { phone, amount,bookingId } = req.body;
        const paymentLink = generatePaymentLink({ amount });
        const payment = await Payment.create({
            phone,
            amount,
            status: 'pending',
            paymentLink,
            bookingId
        });
        reply.code(201).send(payment);
    } catch (err) {
        reply.code(400).send({ error: err.message });
    }
};

exports.getPayment = async (req, reply) => {
    try {
        const { id } = req.params;
        const payment = await Payment.findByPk(id);
        if (!payment) {
            return reply.code(404).send({ error: 'Payment not found' });
        }
        reply.send(payment);
    } catch (err) {
        reply.code(400).send({ error: err.message });
    }
}

exports.getAllPayment = async (req, reply) => {
    try {
        const payments = await Payment.findAll();
        reply.send(payments);
    } catch (err) {
        reply.code(400).send({ error: err.message });
    }
}