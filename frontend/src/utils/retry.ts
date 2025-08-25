/**
 * 带重试机制的API调用工具
 */

export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: number;
  maxDelay?: number;
}

export interface RetryableError {
  code?: string;
  response?: {
    status: number;
  };
  message?: string;
}

/**
 * 判断错误是否应该重试
 */
export function shouldRetry(error: RetryableError, attempt: number, maxRetries: number): boolean {
  if (attempt >= maxRetries) {
    return false;
  }

  // 网络错误，连接超时，服务器错误等应该重试
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  const retryableErrorCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET'];

  if (error.response?.status && retryableStatusCodes.includes(error.response.status)) {
    return true;
  }

  if (error.code && retryableErrorCodes.includes(error.code)) {
    return true;
  }

  if (error.message?.includes('timeout') || error.message?.includes('network')) {
    return true;
  }

  return false;
}

/**
 * 延迟函数
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带指数退避的延迟计算
 */
export function calculateDelay(attempt: number, baseDelay: number, backoff: number, maxDelay: number): number {
  const delay = baseDelay * Math.pow(backoff, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * 带重试机制的异步函数包装器
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay: baseDelay = 1000,
    backoff = 2,
    maxDelay = 10000,
  } = options;

  let lastError: Error | RetryableError;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error | RetryableError;

      // 如果是最后一次尝试，抛出错误
      if (attempt > maxRetries || !shouldRetry(lastError, attempt, maxRetries)) {
        throw lastError;
      }

      // 计算延迟时间
      const waitTime = calculateDelay(attempt, baseDelay, backoff, maxDelay);
      
      // 记录重试日志
      console.warn(`API调用失败，${waitTime}ms后重试 (${attempt}/${maxRetries}):`, {
        error: lastError.message || lastError,
        attempt,
        maxRetries,
        waitTime,
      });

      await delay(waitTime);
    }
  }

  throw lastError!;
}

/**
 * 创建带重试的API调用函数
 */
export function createRetryableApi<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: RetryOptions
): T {
  return (async (...args: Parameters<T>) => {
    return withRetry(() => fn(...args), options);
  }) as T;
}