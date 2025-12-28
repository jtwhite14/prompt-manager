import '@testing-library/jest-dom'
import 'fake-indexeddb/auto'

// Mock crypto.randomUUID for tests
if (!globalThis.crypto) {
  globalThis.crypto = {} as Crypto
}
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    }) as `${string}-${string}-${string}-${string}-${string}`
  }
}

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
})

// Mock fetch for sync tests
globalThis.fetch = vi.fn()

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
