import { ISignInProps } from './hooks/mutations/useSignInMutation/interfaces';
import { apiClient } from '../../common/api-client/api-client';
import { z } from 'zod';
import { handleZodError } from '../../common/utils/handle-zod-error/handle-zod-error';
import { Method } from '../../common/enums';
import { AuthenticatedUserSchema } from './validation-schemas';
import posthog from 'posthog-js';

export const fetchSignOut = async ({ callbackUrl }: ISignInProps) => {
  const [session, error] = await apiClient({
    endpoint: `auth/logout`,
    method: Method.POST,
    schema: z.any(),
    body: {
      callbackUrl,
    },
  });
  try {
    posthog.reset();
  } catch (error) {
    console.error('Error resetting PostHog:', error);
  }

  posthog.reset();

  return handleZodError(error, session);
};

export const fetchSignIn = async ({ callbackUrl, body }: ISignInProps) => {
  const [session, error] = await apiClient({
    endpoint: 'auth/login',
    method: Method.POST,
    schema: z.any(),
    body: {
      ...body,
      callbackUrl,
    },
    options: {
      headers: {
        /**
         * Make sure headers like Authorization or credentials
         * set in {@link apiClient} don't get in the way if the
         * sign in route uses a different authentication method
         * or doesn't use one.
         */
        // Authorization: `Bearer ${token}`,
      },
    },
  });

  console.log('1. fetchSignIn auth/login Session Information:', JSON.stringify(session, null, 2));
  console.log('2. fetchSignIn auth/login Error Information:', JSON.stringify(error, null, 2));
  console.log('3. fetchSignIn auth/login Body Information:', JSON.stringify(body, null, 2));
  console.log('4. fetchSignIn auth/login Callback URL:', callbackUrl);

  return handleZodError(error, session);
};

export const fetchAuthenticatedUser = async () => {
  const [session, error] = await apiClient({
    endpoint: `auth/session`,
    method: Method.GET,
    schema: z.object({
      user: AuthenticatedUserSchema,
    }),
  });

  const testSession = {
    user: {
      id: 'cm0ov7c210000jy8z61jphpqo',
      email: 'balkis@gmail.io',
      firstName: 'Balkis',
      lastName: 'Luta',
      roles: ['user', 'customer', 'admin'],
    },
  };

  try {
    console.log(
      'fetchAuthenticatedUser auth/session Session Information:',
      JSON.stringify(testSession, null, 2),
    );
    posthog.identify(testSession?.user?.id, {
      email: testSession?.user?.email,
      name: testSession?.user?.lastName,
    });
  } catch (error) {
    console.error('Error identifying user in PostHog:', error);
  }

  return handleZodError(error, testSession);
};
