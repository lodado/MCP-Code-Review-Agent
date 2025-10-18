// Jest setup file

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock process.cwd for consistent testing
jest.mock("process", () => ({
  ...jest.requireActual("process"),
  cwd: jest.fn(() => "/mock/project/path"),
}));
