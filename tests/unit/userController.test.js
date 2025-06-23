const mockUserFacade = {
  getAllDriverApplications: jest.fn(),
  reviewDriverApplication: jest.fn(),
  getAllUsers: jest.fn(),
  getUserById: jest.fn(),
  requestLoginOtp: jest.fn(),
  login: jest.fn(),
  requestRegisterOtp: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  updateFcmToken: jest.fn(),
  updateLocation: jest.fn(),
  submitDriverApplication: jest.fn(),
  getDriverApplicationStatus: jest.fn(),
  blockUser: jest.fn(),
};

jest.unstable_mockModule('../../src/modules/user-module/facades/userFacade.js', () => ({
  userFacade: mockUserFacade,

}));
import {describe, expect, jest} from '@jest/globals';

// Mocks
const mockSignToken = jest.fn(() => 'mocked.jwt.token');
const fastify = { signToken: mockSignToken,log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  } };

const reply = () => {
  const res = {};
  res.send = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

let controller;
beforeAll(async () => {
  const { userControllerFactory } = await import('../../src/modules/user-module/controllers/userController.js');
  controller = userControllerFactory(fastify);
});

describe('userController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all userFacade mocks to default resolved values
    Object.keys(mockUserFacade).forEach(key => {
      mockUserFacade[key].mockReset();
      mockUserFacade[key].mockResolvedValue(undefined);
    });
  });
  // Add tests for each controller method here
  // Example for getAllDriverApplications:
  describe('getAllDriverApplications', () => {
    it('should return applications on success', async () => {
      const applications = [{ id: 1 }, { id: 2 }];
      mockUserFacade.getAllDriverApplications.mockResolvedValueOnce(applications);
      const res = reply();
      await controller.getAllDriverApplications({}, res);
      expect(res.send).toHaveBeenCalledWith({ applications });
    });
    it('should handle errors', async () => {
      mockUserFacade.getAllDriverApplications.mockRejectedValueOnce(new Error('fail'));
      const res = reply();
      await controller.getAllDriverApplications({}, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'Failed to fetch applications', message: 'fail' });
    });
  });

  describe('reviewDriverApplication', () => {
    it('should return 400 for invalid status', async () => {
      const res = reply();
      await controller.reviewDriverApplication({ params: { id: '1' }, body: { status: 'invalid' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: 'Invalid status' });
    });
    it('should return application on success', async () => {
      const application = { id: 1 };
      mockUserFacade.reviewDriverApplication.mockResolvedValueOnce(application);
      const res = reply();
      await controller.reviewDriverApplication({ params: { id: '1' }, body: { status: 'approved', comments: 'ok' } }, res);
      expect(res.send).toHaveBeenCalledWith({ application });
    });
    it('should handle not found', async () => {
      mockUserFacade.reviewDriverApplication.mockRejectedValueOnce(new Error('Application not found'));
      const res = reply();
      await controller.reviewDriverApplication({ params: { id: '1' }, body: { status: 'approved', comments: 'ok' } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'Failed to review application', message: 'Application not found' });
    });
    it('should handle other errors', async () => {
      mockUserFacade.reviewDriverApplication.mockRejectedValueOnce(new Error('fail'));
      const res = reply();
      await controller.reviewDriverApplication({ params: { id: '1' }, body: { status: 'approved', comments: 'ok' } }, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'Failed to review application', message: 'fail' });
    });
  });

  describe('getAllUsers', () => {
    it('should return users on success', async () => {
      const users = [{ id: 1 }];
      mockUserFacade.getAllUsers.mockResolvedValueOnce(users);
      const res = reply();
      await controller.getAllUsers({}, res);
      expect(res.send).toHaveBeenCalledWith(users);
    });
    it('should handle errors', async () => {
      mockUserFacade.getAllUsers.mockRejectedValueOnce(new Error('fail'));
      const res = reply();
      await controller.getAllUsers({}, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'Failed to retrieve users' });
    });
  });

  describe('getUserById', () => {
    it('should return user on success', async () => {
      const user = { id: 1 };
      mockUserFacade.getUserById.mockResolvedValueOnce(user); // Ensure mock returns user
      const res = reply();
      await controller.getUserById({ params: { id: '1' } }, res);
      expect(res.send).toHaveBeenCalledWith({ user });
    });
    it('should return 404 if not found', async () => {
      mockUserFacade.getUserById.mockResolvedValueOnce(null); // Ensure mock returns null
      const res = reply();
      await controller.getUserById({ params: { id: '1' } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'User not found' });
    });
    it('should handle errors', async () => {
      mockUserFacade.getUserById.mockRejectedValueOnce(new Error('fail')); // Ensure mock throws error
      const res = reply();
      await controller.getUserById({ params: { id: '1' } }, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'Failed to retrieve user' });
    });
  });

  describe('requestLoginOtp', () => {
    it('should return 400 if no phone or email', async () => {
      const res = reply();
      await controller.requestLoginOtp({ body: {} }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: 'Phone number or email are required' });
    });
    it('should return 400 for invalid email domain', async () => {
      const res = reply();
      await controller.requestLoginOtp({ body: { email: 'foo@bar.com' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: 'Invalid email domain' });
    });
    it('should return otp on success', async () => {
      mockUserFacade.requestLoginOtp.mockResolvedValueOnce({ otp: '1234' });
      const res = reply();
      await controller.requestLoginOtp({ body: { phoneNumber: '123' } }, res);
      expect(res.send).toHaveBeenCalledWith({ success: true, otp: '1234' });
    });
    it('should handle errors', async () => {
      mockUserFacade.requestLoginOtp.mockRejectedValueOnce(new Error('fail'));
      const res = reply();
      await controller.requestLoginOtp({ body: { phoneNumber: '123' } }, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({ error: 'fail' });
    });
  });

  describe('login', () => {
    it('should return 400 if no phone/email', async () => {
      const res = reply();
      await controller.login({ body: { otp: '1234' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: 'Phone number or email are required' });
    });
    it('should return 400 if no otp', async () => {
      const res = reply();
      await controller.login({ body: { phoneNumber: '123' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: 'OTP is required' });
    });
    it('should return 400 for invalid email domain', async () => {
      const res = reply();
      await controller.login({ body: { email: 'foo@bar.com', otp: '1234' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: 'Invalid email domain' });
    });
    it('should return user and token on success', async () => {
      const user = { id: 1, phoneNumber: '123', email: 'foo@tyvaa.live', isDriver: false };
      mockUserFacade.login.mockResolvedValueOnce(user);
      const res = reply();
      await controller.login({ body: { phoneNumber: '123', otp: '1234' } }, res);
      expect(res.send).toHaveBeenCalledWith({ user, token: 'mocked.jwt.token' });
    });
    it('should handle invalid otp', async () => {
      mockUserFacade.login.mockRejectedValueOnce(new Error('Invalid OTP'));
      const res = reply();
      await controller.login({ body: { phoneNumber: '123', otp: '1234' } }, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({ error: 'Invalid OTP' });
    });
    it('should handle not found', async () => {
      mockUserFacade.login.mockRejectedValueOnce(new Error('not found'));
      const res = reply();
      await controller.login({ body: { phoneNumber: '123', otp: '1234' } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'not found' });
    });
    it('should handle null user', async () => {
      mockUserFacade.login.mockResolvedValueOnce(null);
      const res = reply();
      await controller.login({ body: { phoneNumber: '123', otp: '1234' } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });

  describe('requestRegisterOtp', () => {
    it('should return otp on success', async () => {
      mockUserFacade.requestRegisterOtp.mockResolvedValueOnce('1234');
      const res = reply();
      await controller.requestRegisterOtp({ body: { phoneNumber: '123' } }, res);
      expect(res.send).toHaveBeenCalledWith({ success: true, otp: '1234' });
    });
    it('should handle errors', async () => {
      mockUserFacade.requestRegisterOtp.mockRejectedValueOnce(new Error('fail'));
      const res = reply();
      await controller.requestRegisterOtp({ body: { phoneNumber: '123' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: 'fail' });
    });
  });

  describe('createUser', () => {
    it('should return user and token on success', async () => {
      const user = { id: 1, phoneNumber: '123' };
      mockUserFacade.createUser.mockResolvedValueOnce(user);
      const res = reply();
      await controller.createUser({ body: user }, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({ user, token: 'mocked.jwt.token' });
    });
    it('should handle user already exists', async () => {
      mockUserFacade.createUser.mockRejectedValueOnce(new Error('User already exists'));
      const res = reply();
      await controller.createUser({ body: { phoneNumber: '123' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: 'User already exists' });
    });
    it('should handle invalid otp', async () => {
      mockUserFacade.createUser.mockRejectedValueOnce(new Error('Invalid OTP'));
      const res = reply();
      await controller.createUser({ body: { phoneNumber: '123' } }, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: 'Invalid OTP' });
    });
    it('should handle other errors', async () => {
      mockUserFacade.createUser.mockRejectedValueOnce(new Error('fail'));
      const res = reply();
      await controller.createUser({ body: { phoneNumber: '123' } }, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'fail' });
    });
  });

  describe('updateUser', () => {
    it('should update user and return result', async () => {
      const user = { id: 1 };
      mockUserFacade.updateUser.mockResolvedValueOnce(user);
      // Simulate multipart parts
      const part1 = { fieldname: 'name', value: 'foo', file: false };
      const part2 = { fieldname: 'profile_image', file: true, filename: 'img.png', toBuffer: jest.fn().mockResolvedValue(Buffer.from('')) };
      const req = {
        params: { id: '1' },
        parts: async function* () { yield part1; yield part2; }
      };
      const res = reply();
      await controller.updateUser(req, res);
      expect(res.send).toHaveBeenCalledWith({ user });
    });
    it('should handle user not found', async () => {
      mockUserFacade.updateUser.mockRejectedValueOnce(new Error('User not found'));
      const req = {
        params: { id: '1' },
        parts: async function* () {}
      };
      const res = reply();
      await controller.updateUser(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'User not found' });
    });
    it('should handle other errors', async () => {
      mockUserFacade.updateUser.mockRejectedValueOnce(new Error('fail'));
      const req = {
        params: { id: '1' },
        parts: async function* () {}
      };
      const res = reply();
      await controller.updateUser(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'fail' });
    });
  });

  describe('deleteUser', () => {
    it('should return 204 on success', async () => {
      mockUserFacade.deleteUser.mockResolvedValueOnce();
      const res = reply();
      await controller.deleteUser({ params: { id: '1' } }, res);
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
    it('should handle user not found', async () => {
      mockUserFacade.deleteUser.mockRejectedValueOnce(new Error('User not found'));
      const res = reply();
      await controller.deleteUser({ params: { id: '1' } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'User not found' });
    });
    it('should handle other errors', async () => {
      mockUserFacade.deleteUser.mockRejectedValueOnce(new Error('fail'));
      const res = reply();
      await controller.deleteUser({ params: { id: '1' } }, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'fail' });
    });
  });

  describe('updateFcmToken', () => {
    it('should update FCM token and return user', async () => {
      const user = { id: 1 };
      mockUserFacade.updateFcmToken.mockResolvedValueOnce(user);
      const res = reply();
      await controller.updateFcmToken({ user: { id: '1' }, body: { fcmToken: 'token' } }, res);
      expect(res.send).toHaveBeenCalledWith({ user });
    });
    it('should handle errors', async () => {
      mockUserFacade.updateFcmToken.mockRejectedValueOnce(new Error('fail'));
      const res = reply();
      await controller.updateFcmToken({ user: { id: '1' }, body: { fcmToken: 'token' } }, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'fail' });
    });
  });

  describe('updateLocation', () => {
    it('should update location and return user', async () => {
      const user = { id: 1 };
      mockUserFacade.updateLocation.mockResolvedValueOnce(user);
      const res = reply();
      await controller.updateLocation({ user: { id: '1' }, body: { location: {} } }, res);
      expect(res.send).toHaveBeenCalledWith({ success: true, user, message: 'Location updated successfully' });
    });
    it('should handle errors', async () => {
      mockUserFacade.updateLocation.mockRejectedValueOnce(new Error('fail'));
      const res = reply();
      await controller.updateLocation({ user: { id: '1' }, body: { location: {} } }, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'fail' });
    });
  });

  describe('submitDriverApplication', () => {
    it('should submit application and return result', async () => {
      const application = { id: 1 };
      mockUserFacade.submitDriverApplication.mockResolvedValueOnce(application);
      const req = { user: { id: '1' }, parts: jest.fn() };
      const res = reply();
      await controller.submitDriverApplication(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({ application });
    });
    it('should handle required/pending error', async () => {
      mockUserFacade.submitDriverApplication.mockRejectedValueOnce(new Error('required'));
      const req = { user: { id: '1' }, parts: jest.fn() };
      const res = reply();
      await controller.submitDriverApplication(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: 'required' });
    });
    it('should handle other errors', async () => {
      mockUserFacade.submitDriverApplication.mockRejectedValueOnce(new Error('fail'));
      const req = { user: { id: '1' }, parts: jest.fn() };
      const res = reply();
      await controller.submitDriverApplication(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'fail' });
    });
  });

  describe('getDriverApplicationStatus', () => {
    it('should return status on success', async () => {
      const status = { status: 'pending' };
      mockUserFacade.getDriverApplicationStatus.mockResolvedValueOnce(status);
      const res = reply();
      await controller.getDriverApplicationStatus({ user: { id: '1' } }, res);
      expect(res.send).toHaveBeenCalledWith(status);
    });
    it('should handle errors', async () => {
      mockUserFacade.getDriverApplicationStatus.mockRejectedValueOnce(new Error('fail'));
      const res = reply();
      await controller.getDriverApplicationStatus({ user: { id: '1' } }, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'fail' });
    });
  });

  describe('blockUser', () => {
    it('should block user and return result', async () => {
      const user = { id: 1 };
      mockUserFacade.blockUser.mockResolvedValueOnce(user);
      const res = reply();
      await controller.blockUser({ params: { id: '1' } }, res);
      expect(res.send).toHaveBeenCalledWith(user);
    });
    it('should handle user not found', async () => {
      mockUserFacade.blockUser.mockRejectedValueOnce(new Error('User not found'));
      const res = reply();
      await controller.blockUser({ params: { id: '1' } }, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ error: 'User not found' });
    });
    it('should handle other errors', async () => {
      mockUserFacade.blockUser.mockRejectedValueOnce(new Error('fail'));
      const res = reply();
      await controller.blockUser({ params: { id: '1' } }, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: 'fail' });
    });
  });

});
