import { fetcher } from '../utils/fetcher/fetcher';
import { env } from '../env/env';
import { IApiClient } from './interfaces';
import { handlePromise } from '../utils/handle-promise/handle-promise';

/**
 * @description Prepends the API's base url to an endpoint, and sets options and headers re-used across the API.
 *
 * @param endpoint - The endpoint to append to the API's base url - see {@link endpoints}.
 * @param method - Expects {@link Method} for the HTTP method.
 * @param options - Options to pass into {@link fetcher}.
 * @param schema - A zod schema to validate the response against.
 * @param rest - Allows overriding any of the defaults set by the API client.
 */
export const apiClient: IApiClient = async ({ endpoint, method, options, schema, ...rest }) => {
  return handlePromise(
    fetcher({
      url: `${env.VITE_API_URL}/${endpoint}`,
      method,
      options: {
        ...options,
        credentials: 'include',
        body: {
          ...options?.body,
          user: (() => {
            const storedAuthData = window.sessionStorage.getItem('authData');
            if (storedAuthData) {
              const parsedAuthData = JSON.parse(storedAuthData);
              if (parsedAuthData.user) {
                return parsedAuthData.user;
              }
            }
            return undefined;
          })(),
        },
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.VITE_API_KEY}`,
        ...(options?.headers ?? {}),
      },
      schema,
      ...rest,
    }),
  );
};
