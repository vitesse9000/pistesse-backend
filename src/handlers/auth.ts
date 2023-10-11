import { Request, ResponseObject, ResponseToolkit, ServerRoute } from '@hapi/hapi';
import { defaults, seal } from '@hapi/iron';
import { exchangeAuthCode } from '../services/strava';

type ExchangeCodePayload = {
  client_id: 'web',
  grant_type: 'authorization_code',
  code: string,
};

const exchangeCode = async (
  request: Request,
  h: ResponseToolkit,
): Promise<ResponseObject> => {
  const { code } = request.payload as ExchangeCodePayload;

  let tokens: Awaited<ReturnType<typeof exchangeAuthCode>>;
  try {
    tokens = await exchangeAuthCode(code);
  } catch (error) {
    return h.response().code(400);
  }

  // Encrypt the access token to send to the front-end:
  const encryptedAccessToken = await seal({
    accessToken: tokens.access_token,
    expiresAt: tokens.expires_at,
    userId: tokens.athlete.id,
  }, process.env.APP_KEY ?? '', defaults);

  return h.response({
    expires_in  : tokens.expires_in,
    expires_at  : tokens.expires_at,
    access_token: encryptedAccessToken,
  });
};

export default [{
  path: '/token',
  method: 'POST',
  handler: exchangeCode,
}] as ServerRoute[];
