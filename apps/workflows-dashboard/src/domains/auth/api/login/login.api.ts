import { GetSignInDto, GetSignInResponse } from '@/domains/auth/api/login/login.types';
import { request } from '@/lib/request';

export async function fetchSignIn(dto: GetSignInDto): Promise<GetSignInResponse> {
  console.log('dto: ', dto);
  const result = await request.post<GetSignInResponse>('internal/auth/login', dto);
  console.log('login result: ', result.data);
  window.sessionStorage.setItem('authData', JSON.stringify(result.data));
  return result.data;
}
