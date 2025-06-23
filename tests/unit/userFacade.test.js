import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';

const mockDriverApplication = { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn() };
const mockDriverProfile = { findOne: jest.fn(), create: jest.fn() };
const mockUser = { findAll: jest.fn(), findByPk: jest.fn(), findOne: jest.fn() };
const mockPassengerProfile = {};
const mockUserService = {
  findUserByPhoneOrEmail: jest.fn(),
  generateAndStoreOtp: jest.fn(),
  verifyOtp: jest.fn(),
  createUserWithProfile: jest.fn(),
  saveProfileImage: jest.fn(),
  findPassengerProfile: jest.fn(),
  savePdfFromParts: jest.fn(),
};
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

jest.unstable_mockModule('#config/index.js', () => ({
  DriverApplication: mockDriverApplication,
  DriverProfile: mockDriverProfile,
  User: mockUser,
  PassengerProfile: mockPassengerProfile,
}));
jest.unstable_mockModule('../../src/modules/user-module/services/userService.js', () => ({ userService: mockUserService }));
jest.unstable_mockModule('#utils/logger.js', () => ({ default: () => mockLogger }));

let userFacade;
beforeAll(async () => {
  const mod = await import('../../src/modules/user-module/facades/userFacade.js');
  userFacade = mod.userFacade;
});

describe('userFacade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAllDriverApplications returns applications', async () => {
    mockDriverApplication.findAll.mockResolvedValueOnce([{ id: 1 }]);
    const result = await userFacade.getAllDriverApplications();
    expect(result).toEqual([{ id: 1 }]);
    expect(mockLogger.info).toHaveBeenCalledWith('Fetched all driver applications', { count: 1 });
  });

  it('getAllDriverApplications throws on error', async () => {
    mockDriverApplication.findAll.mockRejectedValueOnce(new Error('fail'));
    await expect(userFacade.getAllDriverApplications()).rejects.toThrow('fail');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch driver applications', { error: 'fail' });
  });

  it('reviewDriverApplication returns null if not found', async () => {
    mockDriverApplication.findByPk.mockResolvedValueOnce(null);
    const result = await userFacade.reviewDriverApplication(1, 'approved', 'ok');
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('Application not found', { id: 1 });
  });

  it('reviewDriverApplication updates and returns application', async () => {
    const app = { status: '', comments: '', save: jest.fn(), passengerProfile: { userId: 2 } };
    mockDriverApplication.findByPk.mockResolvedValueOnce(app);
    mockDriverProfile.findOne.mockResolvedValueOnce(null);
    mockDriverProfile.create.mockResolvedValueOnce({});
    const result = await userFacade.reviewDriverApplication(1, 'approved', 'ok');
    expect(app.status).toBe('approved');
    expect(app.comments).toBe('ok');
    expect(app.save).toHaveBeenCalled();
    expect(result).toBe(app);
    expect(mockLogger.info).toHaveBeenCalledWith('Reviewed driver application', { id: 1, status: 'approved' });
  });

  it('reviewDriverApplication throws on error', async () => {
    mockDriverApplication.findByPk.mockRejectedValueOnce(new Error('fail'));
    await expect(userFacade.reviewDriverApplication(1, 'approved', 'ok')).rejects.toThrow('fail');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to review driver application', { id: 1, error: 'fail' });
  });

  it('getAllUsers returns users', async () => {
    mockUser.findAll.mockResolvedValueOnce([{ id: 1 }]);
    const result = await userFacade.getAllUsers();
    expect(result).toEqual([{ id: 1 }]);
    expect(mockLogger.info).toHaveBeenCalledWith('Fetched all users', { count: 1 });
  });

  it('getAllUsers throws on error', async () => {
    mockUser.findAll.mockRejectedValueOnce(new Error('fail'));
    await expect(userFacade.getAllUsers()).rejects.toThrow('fail');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch users', { error: 'fail' });
  });

  it('getUserById returns user', async () => {
    mockUser.findByPk.mockResolvedValueOnce({ id: 1 });
    const result = await userFacade.getUserById(1);
    expect(result).toEqual({ id: 1 });
    expect(mockLogger.info).toHaveBeenCalledWith('Fetched user by id', { id: 1 });
  });

  it('getUserById returns null if not found', async () => {
    mockUser.findByPk.mockResolvedValueOnce(null);
    const result = await userFacade.getUserById(2);
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('User not found', { id: 2 });
  });

  it('getUserById throws on error', async () => {
    mockUser.findByPk.mockRejectedValueOnce(new Error('fail'));
    await expect(userFacade.getUserById(3)).rejects.toThrow('fail');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch user by id', { id: 3, error: 'fail' });
  });

  it('requestLoginOtp returns null if user not found', async () => {
    mockUserService.findUserByPhoneOrEmail.mockResolvedValueOnce(null);
    const result = await userFacade.requestLoginOtp({ email: 'a@b.com' });
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('User not found for login OTP', { contact: { email: 'a@b.com' } });
  });

  it('requestLoginOtp returns user and otp', async () => {
    mockUserService.findUserByPhoneOrEmail.mockResolvedValueOnce({ id: 1 });
    mockUserService.generateAndStoreOtp.mockResolvedValueOnce('123456');
    const result = await userFacade.requestLoginOtp({ phoneNumber: '123' });
    expect(result).toEqual({ user: { id: 1 }, otp: '123456' });
    expect(mockLogger.info).toHaveBeenCalledWith('Generated login OTP', { contact: { phoneNumber: '123' } });
  });

  it('requestLoginOtp throws on error', async () => {
    mockUserService.findUserByPhoneOrEmail.mockRejectedValueOnce(new Error('fail'));
    await expect(userFacade.requestLoginOtp({})).rejects.toThrow('fail');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to request login OTP', { contact: {}, error: 'fail' });
  });

  it('login returns null if user not found', async () => {
    mockUserService.findUserByPhoneOrEmail.mockResolvedValueOnce(null);
    const result = await userFacade.login({ phoneNumber: '123', otp: '111111' });
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('User not found for login', { phoneNumber: '123', email: undefined });
  });

  it('login throws if OTP fails', async () => {
    mockUserService.findUserByPhoneOrEmail.mockResolvedValueOnce({ id: 1 });
    mockUserService.verifyOtp = jest.fn().mockRejectedValueOnce(new Error('fail'));
    await expect(userFacade.login({ phoneNumber: '123', otp: '111111' })).rejects.toThrow('fail');
    expect(mockLogger.warn).toHaveBeenCalledWith('Login failed', { phoneNumber: '123', email: undefined, error: 'fail' });
  });

  it('login returns user on success', async () => {
    mockUserService.findUserByPhoneOrEmail.mockResolvedValueOnce({ id: 1 });
    mockUserService.verifyOtp = jest.fn().mockResolvedValueOnce();
    const result = await userFacade.login({ phoneNumber: '123', otp: '111111' });
    expect(result).toEqual({ id: 1 });
    expect(mockLogger.info).toHaveBeenCalledWith('User logged in', { id: 1 });
  });

  it('requestRegisterOtp returns null if user exists', async () => {
    mockUser.findOne.mockResolvedValueOnce({ id: 1 });
    const result = await userFacade.requestRegisterOtp('123');
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('User already exists for register OTP', { phoneNumber: '123' });
  });

  it('requestRegisterOtp returns otp if user does not exist', async () => {
    mockUser.findOne.mockResolvedValueOnce(null);
    mockUserService.generateAndStoreOtp.mockResolvedValueOnce('654321');
    const result = await userFacade.requestRegisterOtp('123');
    expect(result).toBe('654321');
    expect(mockLogger.info).toHaveBeenCalledWith('Generated register OTP', { phoneNumber: '123' });
  });

  it('requestRegisterOtp throws on error', async () => {
    mockUser.findOne.mockRejectedValueOnce(new Error('fail'));
    await expect(userFacade.requestRegisterOtp('123')).rejects.toThrow('fail');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to request register OTP', { phoneNumber: '123', error: 'fail' });
  });

  it('createUser returns user on success', async () => {
    mockUserService.verifyOtp = jest.fn().mockResolvedValueOnce();
    mockUserService.createUserWithProfile = jest.fn().mockResolvedValueOnce({ id: 2 });
    const result = await userFacade.createUser({ phoneNumber: '123', otp: '111111' });
    expect(result).toEqual({ id: 2 });
    expect(mockLogger.info).toHaveBeenCalledWith('User created', { id: 2 });
  });

  it('createUser throws if OTP fails', async () => {
    mockUserService.verifyOtp = jest.fn().mockRejectedValueOnce(new Error('fail'));
    await expect(userFacade.createUser({ phoneNumber: '123', otp: '111111' })).rejects.toThrow('fail');
    expect(mockLogger.warn).toHaveBeenCalledWith('Failed to create user', { phoneNumber: '123', error: 'fail' });
  });

  it('updateUser returns null if user not found', async () => {
    mockUser.findByPk.mockResolvedValueOnce(null);
    const result = await userFacade.updateUser(1, { name: 'A' });
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('User not found for update', { id: 1 });
  });

  it('updateUser updates user and returns it', async () => {
    const user = { save: jest.fn(), name: '', profileImage: '', id: 1 };
    mockUser.findByPk.mockResolvedValueOnce(user);
    mockUserService.saveProfileImage = jest.fn().mockReturnValue('/uploads/img.jpg');
    const result = await userFacade.updateUser(1, { name: 'A' }, { buffer: Buffer.from('a'), filename: 'img.jpg' });
    expect(user.name).toBe('A');
    expect(user.profileImage).toBe('/uploads/img.jpg');
    expect(user.save).toHaveBeenCalled();
    expect(result).toBe(user);
    expect(mockLogger.info).toHaveBeenCalledWith('User updated', { id: 1 });
  });

  it('updateUser throws on error', async () => {
    mockUser.findByPk.mockRejectedValueOnce(new Error('fail'));
    await expect(userFacade.updateUser(1, { name: 'A' })).rejects.toThrow('fail');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to update user', { id: 1, error: 'fail' });
  });

  it('deleteUser returns false if user not found', async () => {
    mockUser.findByPk.mockResolvedValueOnce(null);
    const result = await userFacade.deleteUser(1);
    expect(result).toBe(false);
    expect(mockLogger.warn).toHaveBeenCalledWith('User not found for delete', { id: 1 });
  });

  it('deleteUser returns true on success', async () => {
    const user = { destroy: jest.fn(), id: 1 };
    mockUser.findByPk.mockResolvedValueOnce(user);
    const result = await userFacade.deleteUser(1);
    expect(user.destroy).toHaveBeenCalled();
    expect(result).toBe(true);
    expect(mockLogger.info).toHaveBeenCalledWith('User deleted', { id: 1 });
  });

  it('deleteUser throws on error', async () => {
    mockUser.findByPk.mockRejectedValueOnce(new Error('fail'));
    await expect(userFacade.deleteUser(1)).rejects.toThrow('fail');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to delete user', { id: 1, error: 'fail' });
  });

  it('updateFcmToken returns null if user not found', async () => {
    mockUser.findByPk.mockResolvedValueOnce(null);
    const result = await userFacade.updateFcmToken(1, 'token');
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('User not found for FCM token update', { id: 1 });
  });

  it('updateFcmToken updates user and returns it', async () => {
    const user = { save: jest.fn(), id: 1 };
    mockUser.findByPk.mockResolvedValueOnce(user);
    const result = await userFacade.updateFcmToken(1, 'token');
    expect(user.fcmToken).toBe('token');
    expect(user.save).toHaveBeenCalled();
    expect(result).toBe(user);
    expect(mockLogger.info).toHaveBeenCalledWith('Updated FCM token', { id: 1 });
  });

  it('updateFcmToken throws on error', async () => {
    mockUser.findByPk.mockRejectedValueOnce(new Error('fail'));
    await expect(userFacade.updateFcmToken(1, 'token')).rejects.toThrow('fail');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to update FCM token', { id: 1, error: 'fail' });
  });

  it('updateLocation returns null if user not found', async () => {
    mockUser.findByPk.mockResolvedValueOnce(null);
    const result = await userFacade.updateLocation(1, { latitude: 1, longitude: 2 });
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('User not found for location update', { id: 1 });
  });

  it('updateLocation updates user and returns it', async () => {
    const user = { save: jest.fn(), id: 1 };
    mockUser.findByPk.mockResolvedValueOnce(user);
    const result = await userFacade.updateLocation(1, { latitude: 1, longitude: 2 });
    expect(user.latitude).toBe(1);
    expect(user.longitude).toBe(2);
    expect(user.save).toHaveBeenCalled();
    expect(result).toBe(user);
    expect(mockLogger.info).toHaveBeenCalledWith('Updated user location', { id: 1 });
  });

  it('updateLocation throws on error', async () => {
    mockUser.findByPk.mockRejectedValueOnce(new Error('fail'));
    await expect(userFacade.updateLocation(1, { latitude: 1, longitude: 2 })).rejects.toThrow('fail');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to update user location', { id: 1, error: 'fail' });
  });

  it('submitDriverApplication returns null if passenger not found', async () => {
    mockUserService.findPassengerProfile.mockResolvedValueOnce(null);
    const result = await userFacade.submitDriverApplication(1, []);
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('Passenger profile not found for driver application', { userId: 1 });
  });

  it('submitDriverApplication returns null if pending exists', async () => {
    mockUserService.findPassengerProfile.mockResolvedValueOnce({ id: 2 });
    mockDriverApplication.findOne.mockResolvedValueOnce({ id: 3 });
    const result = await userFacade.submitDriverApplication(1, []);
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('Pending driver application exists', { userId: 1 });
  });

  it('submitDriverApplication creates application and returns it', async () => {
    mockUserService.findPassengerProfile.mockResolvedValueOnce({ id: 2 });
    mockDriverApplication.findOne.mockResolvedValueOnce(null);
    mockUserService.savePdfFromParts.mockResolvedValueOnce('/uploads/doc.pdf');
    mockDriverApplication.create = jest.fn().mockResolvedValueOnce({ id: 4 });
    const result = await userFacade.submitDriverApplication(1, []);
    expect(result).toEqual({ id: 4 });
    expect(mockLogger.info).toHaveBeenCalledWith('Submitted driver application', { userId: 1 });
  });

  it('submitDriverApplication throws on error', async () => {
    mockUserService.findPassengerProfile.mockRejectedValueOnce(new Error('fail'));
    await expect(userFacade.submitDriverApplication(1, [])).rejects.toThrow('fail');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to submit driver application', { userId: 1, error: 'fail' });
  });

  it('getDriverApplicationStatus returns none if no passenger', async () => {
    mockUserService.findPassengerProfile.mockResolvedValueOnce(null);
    const result = await userFacade.getDriverApplicationStatus(1);
    expect(result).toEqual({ status: 'none', comments: null });
    expect(mockLogger.info).toHaveBeenCalledWith('No passenger profile for driver application status', { userId: 1 });
  });

  it('getDriverApplicationStatus returns none if no application', async () => {
    mockUserService.findPassengerProfile.mockResolvedValueOnce({ id: 2 });
    mockDriverApplication.findOne.mockResolvedValueOnce(null);
    const result = await userFacade.getDriverApplicationStatus(1);
    expect(result).toEqual({ status: 'none', comments: null });
    expect(mockLogger.info).toHaveBeenCalledWith('No driver application found', { userId: 1 });
  });

  it('getDriverApplicationStatus returns status and comments', async () => {
    mockUserService.findPassengerProfile.mockResolvedValueOnce({ id: 2 });
    mockDriverApplication.findOne.mockResolvedValueOnce({ status: 'pending', comments: 'ok' });
    const result = await userFacade.getDriverApplicationStatus(1);
    expect(result).toEqual({ status: 'pending', comments: 'ok' });
    expect(mockLogger.info).toHaveBeenCalledWith('Fetched driver application status', { userId: 1, status: 'pending' });
  });

  it('getDriverApplicationStatus throws on error', async () => {
    mockUserService.findPassengerProfile.mockRejectedValueOnce(new Error('fail'));
    await expect(userFacade.getDriverApplicationStatus(1)).rejects.toThrow('fail');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to fetch driver application status', { userId: 1, error: 'fail' });
  });

  it('blockUser returns null if user not found', async () => {
    mockUser.findByPk.mockResolvedValueOnce(null);
    const result = await userFacade.blockUser(1);
    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('User not found for block', { id: 1 });
  });

  it('blockUser blocks user and returns it', async () => {
    const user = { save: jest.fn(), id: 1 };
    mockUser.findByPk.mockResolvedValueOnce(user);
    const result = await userFacade.blockUser(1);
    expect(user.isBlocked).toBe(true);
    expect(user.save).toHaveBeenCalled();
    expect(result).toBe(user);
    expect(mockLogger.info).toHaveBeenCalledWith('Blocked user', { id: 1 });
  });

  it('blockUser throws on error', async () => {
    mockUser.findByPk.mockRejectedValueOnce(new Error('fail'));
    await expect(userFacade.blockUser(1)).rejects.toThrow('fail');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to block user', { id: 1, error: 'fail' });
  });

  // Edge case: submitDriverApplication when savePdfFromParts throws
  it('submitDriverApplication handles error from savePdfFromParts', async () => {
    mockUserService.findPassengerProfile.mockResolvedValueOnce({ id: 2 });
    mockDriverApplication.findOne.mockResolvedValueOnce(null);
    mockUserService.savePdfFromParts.mockRejectedValueOnce(new Error('pdf fail'));
    await expect(userFacade.submitDriverApplication(1, [])).rejects.toThrow('pdf fail');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to submit driver application', { userId: 1, error: 'pdf fail' });
  });

  // Edge case: getDriverApplicationStatus when application.comments is undefined
  it('getDriverApplicationStatus returns status and null comments if comments missing', async () => {
    mockUserService.findPassengerProfile.mockResolvedValueOnce({ id: 2 });
    mockDriverApplication.findOne.mockResolvedValueOnce({ status: 'approved' });
    const result = await userFacade.getDriverApplicationStatus(1);
    expect(result).toEqual({ status: 'approved', comments: null });
    expect(mockLogger.info).toHaveBeenCalledWith('Fetched driver application status', { userId: 1, status: 'approved' });
  });
});
