const mockAsyncStorage = {
  getItem: async (key: string) => null,
  setItem: async (key: string, value: string) => undefined,
  removeItem: async (key: string) => undefined,
  clear: async () => undefined,
}

export default mockAsyncStorage
