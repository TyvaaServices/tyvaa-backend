import sendOtpEmail from '../../src/modules/user-module/utils/sendOtp.js';
import {beforeEach, describe, expect, it, jest} from "@jest/globals";

describe('sendOtpEmail', () => {
    let transporter, logger;
    beforeEach(() => {
        transporter = { sendMail: jest.fn().mockResolvedValue(true) };
        logger = { info: jest.fn(), error: jest.fn() };
    });

    it('should send OTP email and log info', async () => {
        await sendOtpEmail('test@example.com', '123456', transporter, logger);
        expect(transporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: 'test@example.com',
            subject: expect.any(String),
            text: expect.stringContaining('123456'),
        }));
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Sent OTP 123456'));
    });

    it('should log error and throw if sendMail fails', async () => {
        transporter.sendMail.mockRejectedValue(new Error('fail'));
        await expect(sendOtpEmail('fail@example.com', '654321', transporter, logger)).rejects.toThrow('fail');
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to send OTP email'));
    });
});

