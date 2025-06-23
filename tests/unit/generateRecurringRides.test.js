import {jest, describe, it, expect, beforeEach, beforeAll} from '@jest/globals';

const mockFindAll = jest.fn();
const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.unstable_mockModule('../../src/config/index.js', () => ({
  RideModel: { findAll: mockFindAll },
  RideInstance: { findOne: mockFindOne, create: mockCreate },
}));
jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  default: () => mockLogger
}));

let generateRecurringRides;
beforeAll(async () => {
  const mod = await import('../../src/modules/ride-module/cron/generateRecurringRides.js');
  generateRecurringRides = mod.default;
});

describe('generateRecurringRides', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates ride instances for valid recurring rides', async () => {
    const ride = {
      id: 1,
      isRecurring: true,
      status: 'active',
      recurrence: ['Monday'],
      time: '10:00:00',
      seatsAvailable: 3,
    };
    mockFindAll.mockResolvedValueOnce([ride]);
    // Mock today as Monday
    const today = new Date();
    today.setDate(today.getDate() - today.getDay()); // set to Sunday, then +1 for Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + 1);
    jest.spyOn(global, 'Date').mockImplementation(() => monday);
    mockFindOne.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce({});

    await generateRecurringRides();
    expect(mockFindAll).toHaveBeenCalled();
    expect(mockFindOne).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalled();
    jest.spyOn(global, 'Date').mockRestore();
  });

  it('skips rides with invalid recurrence', async () => {
    const ride = {
      id: 2,
      isRecurring: true,
      status: 'active',
      recurrence: null,
    };
    mockFindAll.mockResolvedValueOnce([ride]);
    await generateRecurringRides();
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('invalid recurrence'));
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('logs and throws on error', async () => {
    mockFindAll.mockRejectedValueOnce(new Error('db fail'));
    await expect(generateRecurringRides()).rejects.toThrow('db fail');
    expect(mockLogger.error).toHaveBeenCalledWith('Error generating recurring rides:', expect.any(Error));
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });
});
