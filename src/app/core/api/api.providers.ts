import { provideHttpClient } from '@angular/common/http';
import { EnvironmentProviders } from '@angular/core';

/**
 * HTTP setup for the app. The "demo" build replaces this file with api.providers.demo.ts, which
 * answers the API calls from memory so the app can run on static hosting without json-server.
 */
export function provideApi(): EnvironmentProviders {
  return provideHttpClient();
}
