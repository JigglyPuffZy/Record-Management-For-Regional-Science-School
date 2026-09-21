import { readFileSync } from 'fs';
import createStudent from '../api/create-student.js';
import saveGrade from '../api/save-grade.js';

function loadEnv() {
  try {
    const text = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const key = t.slice(0, i).trim();
      const val = t.slice(i + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // ignore
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function mockRes(res) {
  return {
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    },
    end() {
      res.end();
    },
  };
}

const routes = {
  '/api/create-student': createStudent,
  '/api/save-grade': saveGrade,
};

export function viteApiDev() {
  loadEnv();
  return {
    name: 'vite-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const handler = routes[req.url?.split('?')[0]];
        if (!handler || req.method !== 'POST') return next();
        try {
          req.body = await readBody(req);
          await handler(req, mockRes(res));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}
