import {jest, describe, it, expect, beforeAll, afterAll} from '@jest/globals';

describe('mailer', () => {
  it('should create a transporter with correct config', async () => {
    const createTransport = jest.fn();
    jest.unstable_mockModule('nodemailer', () => ({
      default: { createTransport }
    }));
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    jest.resetModules();
    await import('../../src/utils/mailer.js');
    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: true,
      auth: { user: 'user', pass: 'pass' },
    });
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });
});
