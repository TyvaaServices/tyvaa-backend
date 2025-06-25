import {describe, it, expect, beforeEach, jest, afterAll} from '@jest/globals';

const mockRegister = jest.fn();
const mockDecorate = jest.fn();

let jwtPlugin;
beforeAll(async () => {
  jwtPlugin = (await import('../../src/utils/jwt.js')).default || (await import('../../src/utils/jwt.js'));
});

describe('jwt plugin', () => {
  let fastify;
  beforeEach(() => {
    fastify = {
      register: mockRegister,
      decorate: mockDecorate,
      jwt: { sign: jest.fn(() => 'token'), verify: jest.fn() },
    };
    mockRegister.mockClear();
    mockDecorate.mockClear();
  });

  it('registers fastify-jwt and decorates authenticate and signToken', () => {
    const done = jest.fn();
    jwtPlugin(fastify, {}, done);
    expect(mockRegister).toHaveBeenCalled();
    expect(mockDecorate).toHaveBeenCalledWith('authenticate', expect.any(Function));
    expect(mockDecorate).toHaveBeenCalledWith('signToken', expect.any(Function));
    expect(done).toHaveBeenCalled();
  });

  it('authenticate calls jwtVerify and passes', async () => {
    let authFn;
    mockDecorate.mockImplementation((name, fn) => {
      if (name === 'authenticate') authFn = fn;
    });
    jwtPlugin(fastify, {}, () => {});
    const request = { jwtVerify: jest.fn() };
    const reply = { code: jest.fn().mockReturnThis(), send: jest.fn() };
    await authFn.call(fastify, request, reply);
    expect(request.jwtVerify).toHaveBeenCalled();
  });

  it('authenticate handles error', async () => {
    let authFn;
    mockDecorate.mockImplementation((name, fn) => {
      if (name === 'authenticate') authFn = fn;
    });
    jwtPlugin(fastify, {}, () => {});
    const error = new Error('fail');
    const request = { jwtVerify: jest.fn().mockRejectedValue(error) };
    const reply = { code: jest.fn().mockReturnThis(), send: jest.fn() };
    await authFn.call(fastify, request, reply);
    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Unauthorized', message: 'fail' });
  });

  it('signToken calls jwt.sign', () => {
    let signTokenFn;
    mockDecorate.mockImplementation((name, fn) => {
      if (name === 'signToken') signTokenFn = fn;
    });
    jwtPlugin(fastify, {}, () => {});
    fastify.jwt.sign.mockReturnValue('signed');
    const result = signTokenFn.call(fastify, { foo: 'bar' });
    expect(result).toBe('signed');
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });
});
