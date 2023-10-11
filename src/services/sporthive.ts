import axios from 'axios';
import { parse } from 'node-html-parser';
import { In } from 'typeorm';
import { Activity, Session } from '../entities/Activity';
import { cache } from '../services/cache';
import { getRepository } from './repo';

type FetchRecentActivities = () => Promise<void>;

const sporthive = axios.create({ baseURL: 'https://sporthive.com/Practice/' })

const track = process.env.SPORTHIVE_TRACK;

const cachedFetchRecentActivities: FetchRecentActivities = async (): Promise<void> => {
  const key = 'sporthive.last_time_pulled';
  const ttl = 1 * 60 * 1000; // 1 minute
  const lastTime = cache.get(key);

  if (lastTime) {
    return; // Don't fetch them again.
  }

  await fetchRecentActivities();

  cache.put(key, 'now', ttl);
};

export const fetchRecentActivities: FetchRecentActivities = async (): Promise<void> => {
  // Jump one day forward
  const tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours() + 24);

  // Fetch 100 of the latest activities
  const response = await sporthive.post<string>('/LoadMore', {
    id: track,
    count: 200,
    offset: 0,
    previousDate: tomorrow.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'}).replace(',', ''),
  });

  // Prep an empty array to receive the parsed info.
  let entities: Activity[] = [];
  const fetchedAt = new Date();

  // Parse the HTML to find all necessary info.
  parse(response.data).querySelectorAll('.card').forEach((card) => {
    const dateText = card.querySelector('.practice-session-title h3')?.innerHTML.toString().trim() ?? '';

    card.querySelectorAll('a').forEach((activity) => {
      const id = parseInt(activity.attrs.href.replace('/Practice/Activity/', ''));
      const transponderId = activity.querySelector('.user-data')?.firstChild.innerText.trim() ?? '';

      const date = new Date(dateText);

      // Transponder ID needs to be of format 'XX-12345'
      if (transponderId.match(/\w{2}-\d{5}/)) {
        entities.push({ id, transponderId, fetchedAt, date, sessions: [] });
      }
    });
  });

  const activityIds = entities.map((entity) => entity.id);

  // Check which activities are NOT in the DB yet.
  const repo = await getRepository(Activity);
  const dbActivityIds = (await repo.find({ select: ['id'], where: { id: In(activityIds) } }))
    .map((activity) => activity.id);

  entities = entities.filter((entity) => !dbActivityIds.includes(entity.id as number));

  // Enhance these activities
  entities = (
    await Promise.all(entities.map((entity): Promise<Activity | null> => completeActivityData(entity)))
  ).filter((entity) => entity) as Activity[];

  // Save
  await repo.createQueryBuilder()
    .insert()
    .into(Activity)
    .values(entities)
    .execute();

  // Update the ones from today.
  const activities = await getRepository(Activity);
  const now = new Date(new Date().toISOString().substring(0, 10));
  let todaysActivities = await activities.findBy({ date: now });

  // Don't fetch again the ones we just entered.
  const entityIds = entities.map((activity) => activity.id);
  todaysActivities = todaysActivities.filter((activity) => !entityIds.includes(activity.id));

  entities = (
    await Promise.all(todaysActivities.map((entity): Promise<Activity | null> => completeActivityData(entity)))
  ).filter((entity) => entity) as Activity[];

  // Save
  await repo.createQueryBuilder()
    .insert()
    .into(Activity)
    .values(entities)
    .orUpdate(['fetched_at', 'sessions'], undefined, { upsertType: 'on-duplicate-key-update' })
    .execute();
};

const completeActivityData = async (activity: Activity): Promise<Activity | null> => {
  // MM/DD/YYYY format
  const date = activity.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  const response = await sporthive.get<string>('/PracticeLapTimeData', { params: {
      trackId: track,
      activityId: activity.id as number,
      trackLength: 250,
      startTime: date,
      endTime: date, // same 🤷‍️
  } });

  // Skip private activities
  if (response.data.trim() === '') {
    return null;
  }

  const sessions: Session[] = [];

  const parsed = parse(response.data);

  parsed.querySelectorAll('.title-date-container').forEach((row) => {
    let time = 0;
    let bestLap = 0;

    const id = parseInt(row.querySelector('.session-title')?.innerText.replace('Session', '').trim() ?? '0');

    // Get best lap value
    row.querySelector('.best-lap .value')?.innerText.split(':').reverse().forEach((part, i) => bestLap += parseFloat(part) * (60 ** i));

    // Start time
    const startTime = row.querySelector('.session-time')?.innerText.trim() ?? '';

    // Get total time
    // First we need to select the first lap row, jumping the '.info-label'
    let lastLapRow = row.nextElementSibling.nextElementSibling;

    // Loop next sibling until its next sibling is not a '.info-data' row.
    while (lastLapRow.nextElementSibling && lastLapRow.nextElementSibling.classList.contains('info-data')) {
      lastLapRow = lastLapRow.nextElementSibling;
    }

    // Total time
    lastLapRow.querySelector('.data-total-time')?.innerText.split(':').reverse().forEach((part, i) => time += parseFloat(part) * (60 ** i));

    // Lap count
    const laps = parseInt(lastLapRow.querySelector('.data-lap')?.innerText ?? '0');

    const endDateTime = new Date(`${date} ${startTime}`);
    endDateTime.setSeconds(time);
    const endTime = endDateTime.toISOString().substr(11, 5);

    sessions.push({
      id,
      startTime,
      endTime,
      time,
      laps,
      bestLap,
      avgSpeedInKmh: Math.floor(100 * laps * 250 * 3.6 / time) / 100, // calculate
    });
  });

  return { ...activity, fetchedAt: new Date(), sessions };
};

// Cache unless it's explicitly set to false. By default, we'll cache it.
let exportedFetchRecentActivities = fetchRecentActivities;
if (process.env.CACHE_RECENT_ACTIVITES !== 'false') {
  exportedFetchRecentActivities = cachedFetchRecentActivities;
}

export default { fetchRecentActivities: exportedFetchRecentActivities };
