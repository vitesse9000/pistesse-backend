import axios, { AxiosError, AxiosResponse } from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';
import { setTimeout } from 'timers/promises';

type RefreshTokenResponse = {
  access_token: string,
  refresh_token: string,
  expires_at: number,
  expires_in: number,
};

type Upload = {
  id_str: string,
  activity_id?: number,
};

type AuthCodeResponse = RefreshTokenResponse & {
  athlete: {
    id: number,
    firstname: string,
    lastname: string,
    badge_type_id: number,
    profile: string,
    created_at: string,
    summit: boolean,
  },
};

const strava = axios.create({
  baseURL: 'https://www.strava.com/api/v3',
});

const getHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

/**
 * @return number, the Strava activity ID
 */
export const uploadActivity = async (token: string, file: Readable): Promise<number> => {
  const form = new FormData();
  form.append('file', file);
  form.append('data_type', 'gpx.gz');

  const config = {
    headers: {
      ...getHeaders(token),
      ...form.getHeaders(),
    }
  };

  let response = await strava.post<Upload>('/uploads', form, config);

  while (!response.data.activity_id) {
    // Retrying in 1 sec
    await setTimeout(1000);

    response = await strava.get<Upload>(`/uploads/${response.data.id_str}`, { headers: getHeaders(token) });
  }

  return response.data.activity_id;
};

export const exchangeAuthCode = async (code: string): Promise<AuthCodeResponse> => {
  const body = {
    client_id: process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
  };

  const response = await strava.post<AuthCodeResponse>('/oauth/token', body);

  return response.data;
}
