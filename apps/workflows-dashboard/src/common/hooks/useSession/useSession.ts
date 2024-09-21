import { sessionKeys } from '@/domains/auth/api/session/query-keys';
import { useQuery } from '@tanstack/react-query';

const ONE_MINUTE_IN_MS = 1000 * 60;

export function useSession() {
  let {
    data: user,
    isLoading,
    refetch,
  } = useQuery({
    ...sessionKeys.details(),
    // @ts-ignore
    refetchInterval: ONE_MINUTE_IN_MS,
    retry: (retryCount: number) => retryCount < 3,
  });

  console.log('useSession user: ', JSON.stringify(user));
  if (!user) {
    try {
      const storedAuthData = window.sessionStorage.getItem('authData');
      if (storedAuthData) {
        const storedUser = JSON.parse(storedAuthData);
        if (storedUser) {
          user = storedUser;
        }
      }
    } catch (error) {
      console.error('Failed to retrieve auth data from local storage:', error);
    }
  }

  const isAuthenticated = Boolean(!isLoading && user);

  return {
    isLoading,
    isAuthenticated,
    user,
    refresh: refetch,
  };
}
