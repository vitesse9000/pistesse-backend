import 'reflect-metadata';
import { Server } from '@hapi/hapi';
import { plugin as Inert } from '@hapi/inert';
import api from './handlers/api';
import auth from './handlers/auth';
import Path from 'path';

process.on('unhandledRejection', (err) => {
  console.error(err);
  process.exit(1);
});

const server = new Server({
  port: process.env.APP_PORT,
  host: '127.0.0.1',
  router: {
    stripTrailingSlash: true,
  },
  routes: {
    files: {
      relativeTo: Path.join(__dirname, '../public/build'),
    },
  },
});

(async () => {
  await server.register(Inert);

  await server.register({
    name: 'auth',
    register: server => server.route(auth),
  }, {
    routes: {
      vhost: new URL(process.env.API_HOST as string).hostname,
      prefix: '/oauth',
    },
  });

  await server.register({
    name: 'api',
    register: server => server.route(api),
  }, {
    routes: {
      vhost: new URL(process.env.API_HOST as string).hostname,
      prefix: '/api',
    },
  });

  server.route({
    method: 'GET',
    path: '/{filename*}',
    handler: {
      file: (req) => {
        const filename = req.params.filename;

        if (
          filename.startsWith('static') ||
          filename.endsWith('.json') ||
          filename.endsWith('.ico') ||
          filename.endsWith('.png') ||
          filename.endsWith('.txt')
        ) {
          return filename;
        }

        return 'index.html';
      },
    },
  });

  await server.start();
  console.log('Server running on %s', server.info.uri);
})();

process.on('exit', async () => {
  await server.stop();
});
