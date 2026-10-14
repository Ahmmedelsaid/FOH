import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders } from '@angular/core';
import { mockApiInterceptor } from './mock-api.interceptor';

/** Used instead of api.providers.ts in the "demo" build (see fileReplacements in angular.json). */
export function provideApi(): EnvironmentProviders {
  return provideHttpClient(withInterceptors([mockApiInterceptor]));
}
