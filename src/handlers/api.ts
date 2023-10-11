import { Request, ResponseObject, ResponseToolkit, ServerRoute } from '@hapi/hapi';
import { unseal, defaults } from '@hapi/iron';
import { Activity } from '../entities/Activity';
import { getRepository } from '../services/repo';
import { fetchRecentActivities } from '../services/sporthive';
import { Joi } from '../services/joi';
import { uploadActivity } from '../services/strava';
import { generateGpx } from '../services/trackpy';

const activities = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
  // First try to get more recent activities.
  await fetchRecentActivities();

  // Return
  const activities = await getRepository(Activity);

  const result = await activities.findBy({ date: request.params.date });

  // Don't return intimate data.
  const mapped = result.map((activity) => {
    const { fetchedAt, ...rest } = activity;

    return {
      ...rest,
      date: rest.date.toISOString().substring(0, 10),
    };
  });

  return h.response({ data: mapped });
};

const getRequestSessionsParam = (request: Request): number[] | undefined => {
  if (typeof request.query.sessions === 'string') {
    return request.query.sessions.split(',').map((part: string) => parseInt(part));
  }
};

const upload = async (request: Request, h: ResponseToolkit): Promise<ResponseObject | undefined> => {
  // Get encrypted token from auth header.
  const encryptedToken = request.headers.authorization.replace('Bearer ', '');

  const { accessToken } = await unseal(encryptedToken, process.env.APP_KEY ?? '', defaults) as { accessToken: string };

  const activityId = await uploadActivity(accessToken, await generateGpx(request.params.id, getRequestSessionsParam(request)));

  return h.response({
    data: {
      activity_id: activityId,
    },
  });
};

const download = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
  const gpx = await generateGpx(request.params.id, getRequestSessionsParam(request));

  return h
    .response(gpx)
    .header('Content-Type', 'application/xml')
    .header('Content-Encoding', 'gzip')
    .header('Content-Disposition', `attachment; filename=${request.params.id}.gpx;`);
};

export default [{
  method: 'GET',
  path: '/activities/{date}',
  options: {
    validate: {
      params: Joi.object({
        date: Joi.date().format('YYYY-MM-DD'),
      }),
    },
  },
  handler: activities,
}, {
  method: 'POST',
  path: '/activities/{id}',
  handler: upload,
}, {
  method: 'GET',
  path: '/activities/{id}.gpx',
  handler: download,
}] as ServerRoute[];
