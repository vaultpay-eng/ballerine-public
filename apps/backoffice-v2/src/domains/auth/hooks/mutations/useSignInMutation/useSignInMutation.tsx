import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { ISignInProps } from './interfaces';
import { fetchSignIn } from '../../../fetchers';
import { authQueryKeys } from '../../../query-keys';

export const useSignInMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const getSession = authQueryKeys.authenticatedUser();
  const { state } = useLocation();

  return useMutation({
    mutationFn: ({ callbackUrl, body }: ISignInProps) =>
      fetchSignIn({
        callbackUrl,
        body,
      }),
    onMutate: () => {
      void queryClient.cancelQueries();
    },
    onSuccess: (data, { callbackUrl, redirect }) => {
      console.log('1. useSignInMutation onSuccess Data:', JSON.stringify(data, null, 2));

      try {
        window.sessionStorage.setItem('authData', JSON.stringify(data));
      } catch (error) {
        console.error('Failed to store auth data in local storage:', error);
        // Optionally, you could handle this error more gracefully
      }
      queryClient.setQueryData(getSession.queryKey, data);

      if (!callbackUrl || !redirect) return;

      void navigate(callbackUrl, {
        replace: true,
        state: {
          from: state?.from,
        },
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: getSession.queryKey,
      });
    },
  });
};
