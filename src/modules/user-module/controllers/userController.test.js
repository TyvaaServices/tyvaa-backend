const userController = require('./userController');
const User = require('../models/user');

jest.mock('../models/user');

const mockReply = () => {
  const res = {};
  res.send = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

describe('userController', () => {
  describe('generateOTP', () => {
    it('should generate a 6-digit OTP as a string', () => {
      const otp = userController.generateOTP();
      expect(typeof otp).toBe('string');
      expect(otp).toHaveLength(6);
      expect(Number(otp)).not.toBeNaN();
    });
  });

  describe('getAllUsers', () => {
    it('should return users on success', async () => {
      const users = [{ id: 1, name: 'Test' }];
      User.findAll.mockResolvedValue(users);
      const reply = mockReply();
      await userController.getAllUsers({}, reply);
      expect(reply.send).toHaveBeenCalledWith({ users });
    });

    it('should handle errors and return 500', async () => {
      User.findAll.mockRejectedValue(new Error('DB error'));
      const reply = mockReply();
      await userController.getAllUsers({}, reply);
      expect(reply.status).toHaveBeenCalledWith(500);
      expect(reply.send).toHaveBeenCalledWith({ error: 'Failed to retrieve users' });
    });
  });

  describe('login', () => {
    it('should return 404 if user not found', async () => {
      User.findOne.mockResolvedValue(null);
      const reply = mockReply();
      await userController.login({ body: { phoneNumber: '123' } }, reply);
      expect(reply.status).toHaveBeenCalledWith(404);
      expect(reply.send).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('should return user if found', async () => {
      const user = { id: 1, phoneNumber: '123' };
      User.findOne.mockResolvedValue(user);
      const reply = mockReply();
      await userController.login({ body: { phoneNumber: '123' } }, reply);
      // You may want to check for a specific response if implemented
      // For now, just ensure no error is returned
      expect(reply.status).not.toHaveBeenCalledWith(404);
    });
  });
});

