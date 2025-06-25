import {jest, describe, it, expect, beforeEach, afterAll} from '@jest/globals';

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};
const mockFromEnv = jest.fn(() => mockRedis);

jest.unstable_mockModule('@upstash/redis', () => ({
  Redis: { fromEnv: mockFromEnv },
}));

let RedisCache, redisCacheInstance;
beforeAll(async () => {
  const mod = await import('../../src/utils/redisCache.js');
  RedisCache = mod.RedisCache;
  redisCacheInstance = mod.default;
});

describe('RedisCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (RedisCache.instance) RedisCache.instance = null;
  });

  it('enforces singleton', () => {
    const instance1 = RedisCache.getInstance();
    expect(instance1).toBeInstanceOf(RedisCache);
    expect(() => new RedisCache()).toThrow();
  });

  it('get returns parsed data', async () => {
    mockRedis.get.mockResolvedValueOnce(JSON.stringify({ foo: 'bar' }));
    const result = await redisCacheInstance.get('key');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('get returns null if not found', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    const result = await redisCacheInstance.get('key');
    expect(result).toBeNull();
  });

  it('set stringifies and sets value', async () => {
    mockRedis.set.mockResolvedValueOnce('OK');
    const result = await redisCacheInstance.set('key', { foo: 'bar' }, 100);
    expect(mockRedis.set).toHaveBeenCalledWith('key', JSON.stringify({ foo: 'bar' }), { ex: 100 });
    expect(result).toBe('OK');
  });

  it('del calls redis.del', async () => {
    mockRedis.del.mockResolvedValueOnce(1);
    const result = await redisCacheInstance.del('key');
    expect(mockRedis.del).toHaveBeenCalledWith('key');
    expect(result).toBe(1);
  });

  it('getModel returns built model if Model provided', async () => {
    const obj = { foo: 'bar' };
    mockRedis.get.mockResolvedValueOnce(JSON.stringify(obj));
    const Model = { build: jest.fn((o, opts) => ({ ...o, opts })) };
    const result = await redisCacheInstance.getModel('key', Model);
    expect(Model.build).toHaveBeenCalledWith(obj, { isNewRecord: false });
    expect(result).toEqual({ foo: 'bar', opts: { isNewRecord: false } });
  });

  it('getModel returns null if not found', async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    const result = await redisCacheInstance.getModel('key');
    expect(result).toBeNull();
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });
});
