import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((onFulfilled, onRejected) => {
          mockAxiosInstance._requestInterceptor = { onFulfilled, onRejected };
          return 0;
        }),
      },
      response: {
        use: vi.fn((onFulfilled, onRejected) => {
          mockAxiosInstance._responseInterceptor = { onFulfilled, onRejected };
          return 0;
        }),
      },
    },
    _requestInterceptor: null as { onFulfilled: Function; onRejected: Function } | null,
    _responseInterceptor: null as { onFulfilled: Function; onRejected: Function } | null,
  };

  const mockAxiosCreate = vi.fn(() => mockAxiosInstance);

  return {
    default: {
      create: mockAxiosCreate,
      ...mockAxiosInstance,
    },
  };
});

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('Base URL Configuration', () => {
    it('creates axios instance with default base URL when VITE_API_BASE_URL is not set', async () => {
      // Import the api module which will trigger axios.create
      await import('../config/axios');
      const axiosCreate = axios.create as ReturnType<typeof vi.fn>;

      expect(axiosCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      // Verify baseURL is either the env variable or default
      const callArgs = axiosCreate.mock.calls[0][0];
      expect(callArgs.baseURL).toBeDefined();
      expect(typeof callArgs.baseURL).toBe('string');
    });

    it('creates axios instance with correct default headers', async () => {
      await import('../config/axios');
      const axiosCreate = axios.create as ReturnType<typeof vi.fn>;

      expect(axiosCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );
    });

    it('sets correct timeout value', async () => {
      await import('../config/axios');
      const axiosCreate = axios.create as ReturnType<typeof vi.fn>;

      expect(axiosCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 10000,
        })
      );
    });
  });

  describe('Auth Header Injection', () => {
    it('attaches JWT token to request headers when token exists in localStorage', async () => {
      localStorage.setItem('token', 'test-jwt-token');

      // Clear module cache and re-import to trigger interceptor setup
      vi.resetModules();
      const axiosConfig = await import('../config/axios');
      const api = axiosConfig.default;

      // Get the request interceptor that was registered
      const mockApi = api as any;
      const interceptor = mockApi._requestInterceptor;

      expect(interceptor).not.toBeNull();

      // Simulate a request config
      const config = {
        url: '/sessions',
        headers: {},
      };

      // Call the interceptor's onFulfilled handler
      const modifiedConfig = await interceptor.onFulfilled(config);

      expect(modifiedConfig.headers.Authorization).toBe('Bearer test-jwt-token');
    });

    it('does not attach token for login endpoint', async () => {
      localStorage.setItem('token', 'test-jwt-token');

      vi.resetModules();
      const axiosConfig = await import('../config/axios');
      const api = axiosConfig.default;

      const mockApi = api as any;
      const interceptor = mockApi._requestInterceptor;

      const config = {
        url: '/auth/login',
        headers: {},
      };

      const modifiedConfig = await interceptor.onFulfilled(config);

      expect(modifiedConfig.headers.Authorization).toBeUndefined();
    });

    it('does not attach token for register endpoint', async () => {
      localStorage.setItem('token', 'test-jwt-token');

      vi.resetModules();
      const axiosConfig = await import('../config/axios');
      const api = axiosConfig.default;

      const mockApi = api as any;
      const interceptor = mockApi._requestInterceptor;

      const config = {
        url: '/auth/register',
        headers: {},
      };

      const modifiedConfig = await interceptor.onFulfilled(config);

      expect(modifiedConfig.headers.Authorization).toBeUndefined();
    });

    it('does not attach token when localStorage has no token', async () => {
      vi.resetModules();
      const axiosConfig = await import('../config/axios');
      const api = axiosConfig.default;

      const mockApi = api as any;
      const interceptor = mockApi._requestInterceptor;

      const config = {
        url: '/sessions',
        headers: {},
      };

      const modifiedConfig = await interceptor.onFulfilled(config);

      expect(modifiedConfig.headers.Authorization).toBeUndefined();
    });
  });

  describe('Error Response Handling', () => {
    it('removes token from localStorage on 401 response', async () => {
      localStorage.setItem('token', 'invalid-token');

      vi.resetModules();
      const axiosConfig = await import('../config/axios');
      const api = axiosConfig.default;

      const mockApi = api as any;
      const interceptor = mockApi._responseInterceptor;

      const error = {
        response: {
          status: 401,
        },
      };

      // Call the response error handler
      await expect(interceptor.onRejected(error)).rejects.toBeDefined();

      expect(localStorage.getItem('token')).toBeNull();
    });

    it('does not remove token for non-401 errors', async () => {
      localStorage.setItem('token', 'valid-token');

      vi.resetModules();
      const axiosConfig = await import('../config/axios');
      const api = axiosConfig.default;

      const mockApi = api as any;
      const interceptor = mockApi._responseInterceptor;

      const error = {
        response: {
          status: 500,
        },
      };

      await expect(interceptor.onRejected(error)).rejects.toBeDefined();

      expect(localStorage.getItem('token')).toBe('valid-token');
    });

    it('passes through successful responses unchanged', async () => {
      vi.resetModules();
      const axiosConfig = await import('../config/axios');
      const api = axiosConfig.default;

      const mockApi = api as any;
      const interceptor = mockApi._responseInterceptor;

      const response = {
        data: { success: true },
        status: 200,
      };

      const result = await interceptor.onFulfilled(response);

      expect(result).toEqual(response);
    });

    it('rejects with original error for non-401 responses', async () => {
      vi.resetModules();
      const axiosConfig = await import('../config/axios');
      const api = axiosConfig.default;

      const mockApi = api as any;
      const interceptor = mockApi._responseInterceptor;

      const error = {
        response: {
          status: 404,
          data: { message: 'Not found' },
        },
      };

      await expect(interceptor.onRejected(error)).rejects.toEqual(error);
    });
  });

  describe('Request Interceptor Error Handling', () => {
    it('rejects with original error when request interceptor fails', async () => {
      vi.resetModules();
      const axiosConfig = await import('../config/axios');
      const api = axiosConfig.default;

      const mockApi = api as any;
      const interceptor = mockApi._requestInterceptor;

      const error = new Error('Request failed');

      await expect(interceptor.onRejected(error)).rejects.toEqual(error);
    });
  });
});

describe('Legacy API Exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports submitProblemText function', async () => {
    const legacy = await import('../legacy');
    expect(typeof legacy.submitProblemText).toBe('function');
  });

  it('exports submitProblemImage function', async () => {
    const legacy = await import('../legacy');
    expect(typeof legacy.submitProblemImage).toBe('function');
  });

  it('exports getSessionJourney function', async () => {
    const legacy = await import('../legacy');
    expect(typeof legacy.getSessionJourney).toBe('function');
  });

  it('exports getSessionReport function', async () => {
    const legacy = await import('../legacy');
    expect(typeof legacy.getSessionReport).toBe('function');
  });
});
