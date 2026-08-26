import { registerMediaStreamRoutes } from './media-stream-route.js';
import { createConfiguredMediaStorage } from './media-storage-factory.js';

export function registerConfiguredMediaStreamRoutes(app, env = process.env) {
  const storage = createConfiguredMediaStorage(env);
  registerMediaStreamRoutes(app, { storage });
  return storage;
}
