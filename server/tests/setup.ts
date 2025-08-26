import { jest, beforeAll, afterAll } from '@jest/globals';

jest.setTimeout(15000);

const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' && 
      args[0].includes('Preview handler error')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
