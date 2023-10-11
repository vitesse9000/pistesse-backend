import axios from 'axios';
import { createReadStream, createWriteStream } from 'fs';
import { rm } from 'fs/promises';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { exec as baseExec } from 'child_process';
import { promisify } from 'util';
import { createGzip } from 'zlib';

const exec = promisify(baseExec);

const sporthive = axios.create({
  baseURL: 'https://sporthive.com/Practice/',
});

const attemptRm = async (filename: string): Promise<void> => {
  try { return rm(filename) } catch (e) {}
};

const createCsvFilename = (activityId: number): string => {
  return __dirname + `/../../storage/${activityId.toString()}.csv`;
};

const createGpxFilename = (activityId: number): string => {
  return __dirname + `/../../storage/${activityId.toString()}.gpx`;
};

const createGpxGzFilename = (activityId: number): string => {
  return __dirname + `/../../storage/${activityId.toString()}.gpx.gz`;
};

const getCsv = async (activityId: number): Promise<Readable> => {
  const response = await sporthive.get<Readable>('getCsv', {
    params: { activityId },
    responseType: 'stream',
  });

  return response.data;
};

const writeCsv = async (activityId: number, file: Readable): Promise<void> => {
  await pipeline(file, createWriteStream(createCsvFilename(activityId)));
};

const executeTrackPy = async (activityId: number, sessions?: number[]): Promise<void> => {
  const dir = `${__dirname}/../../../trackpy`;
  const inputFile = createCsvFilename(activityId);
  const outputFile = createGpxFilename(activityId);

  let command;

  if (process.env.PYTHON_VENV) {
    command = `${dir}/${process.env.PYTHON_VENV}/bin/python`;
  } else {
    command = `python3`;
  }

  command = `${command} ${dir}/track_to_gpx.py --input=${inputFile} --output=${outputFile}`;

  if (sessions) {
    command += ` --sessions=${sessions.join(',')}`;
  }

  await exec(command);
};

const gzipGpx = async (activityId: number): Promise<void> => {
  await pipeline(
    createReadStream(createGpxFilename(activityId)),
    createGzip(),
    createWriteStream(createGpxGzFilename(activityId)),
  );
};

const readGpxGz = async (activityId: number): Promise<Readable> => {
  return createReadStream(createGpxGzFilename(activityId));
};

export const generateGpx = async (activityId: number, sessions?: number[]): Promise<Readable> => {
  // Download CSV file
  const csvStream = await getCsv(activityId);

  // Write CSV file to disc
  await writeCsv(activityId, csvStream);

  // Generate GPX from CSV file
  await executeTrackPy(activityId, sessions);

  // Delete GPX.gz from disc
  await attemptRm(createCsvFilename(activityId));

  // Read CSV and return readable stream
  await gzipGpx(activityId);

  // Delete GPX from disc
  await attemptRm(createGpxFilename(activityId));

  const stream = await readGpxGz(activityId);

  // Cleanup after reading this file.
  stream.on('end', () => attemptRm(createGpxGzFilename(activityId)));

  return stream;
};
