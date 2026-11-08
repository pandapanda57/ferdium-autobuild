// Boots the real AdonisJS v4 framework (from the Ferdium checkout) with Ferdium's patched kernel,
// body-parser config and RequireLocalToken middleware, then probes it over HTTP.
// Fails (exit 1) if any request without a valid token reaches BodyParser/routing, or if a
// legitimate Ferdium flow stops working.
// Usage: ADONIS_DEPS=<ferdium checkout> node run.js <approot>
// Based on the harness from the 2026-11-03 adversarial review.
const path = require('node:path');
const http = require('node:http');

const deps = path.resolve(process.env.ADONIS_DEPS);
const appRoot = path.resolve(process.argv[2]);
const req = m => require(require.resolve(m, { paths: [deps] }));

process.env.ENV_PATH = path.join(appRoot, 'env.ini');
const TOKEN = 'T'.repeat(43);
process.env.FERDIUM_LOCAL_TOKEN = TOKEN;
global.__probe = [];
global.__handlers = [];

const fold = req('@adonisjs/fold');
const { Ignitor, hooks } = req('@adonisjs/ignitor');

function send(method, url, { headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port: 46999, method, path: url, headers }, res => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

const B = 'XyZ';
const mp = { 'Content-Type': `multipart/form-data; boundary=${B}` };
const multipart =
  `--${B}\r\nContent-Disposition: form-data; name="field1"\r\n\r\nvalue1\r\n` +
  `--${B}\r\nContent-Disposition: form-data; name="file"; filename="x.txt"\r\nContent-Type: text/plain\r\n\r\nhello\r\n--${B}--\r\n`;
const ferdium = { 'X-Franz-Version': '7', 'X-Ferdium-Local-Token': TOKEN };

// [name, method, url, options, expected statuses, body parser allowed to run?]
const cases = [
  ['no token', 'GET', '/v1/me', {}, [403], false],
  ['valid header', 'GET', '/v1/me', { headers: ferdium }, [200], true],
  ['HEAD valid header', 'HEAD', '/v1/me', { headers: ferdium }, [200], true],
  ['multipart PUT without token', 'PUT', '/v1/service/1', { headers: mp, body: multipart }, [403], false],
  ['multipart POST /import without token', 'POST', '/import', { headers: mp, body: multipart }, [403], false],
  ['static file without token', 'GET', '/css/main.css', {}, [403], false],
  ['static file with ?token', 'GET', `/css/main.css?token=${TOKEN}`, {}, [200], false],
  ['unknown path without token', 'GET', '/nope', {}, [403], false],
  ['OPTIONS without token', 'OPTIONS', '/v1/me', {}, [403], false],
  ['icon with valid ?token', 'GET', `/v1/icon/1?token=${TOKEN}`, {}, [200], true],
  ['icon with repeated ?token (array)', 'GET', `/v1/icon/1?token=${TOKEN}&token=${TOKEN}`, {}, [403], false],
  ['icon with ?token[a] (object)', 'GET', '/v1/icon/1?token[a]=1', {}, [403], false],
  ['/token/<valid>', 'GET', `/token/${TOKEN}`, {}, [302], true],
  ['/token/<wrong, same length>', 'GET', `/token/${'W'.repeat(43)}`, {}, [403], false],
  ['/token/short', 'GET', '/token/short', {}, [403], false],
  ['/token/x with multipart body', 'GET', '/token/x', { headers: mp, body: multipart }, [400, 403], false],
  ['method spoof POST /token/x?_method=GET', 'POST', '/token/x?_method=GET', { headers: mp, body: multipart }, [403, 405], false],
  ['/token/../v1/me', 'GET', '/token/../v1/me', {}, [403], false],
  ['/token/%2e%2e/css/main.css', 'GET', '/token/%2e%2e/css/main.css', {}, [403], false],
  ['//token/x', 'GET', '//token/x', {}, [403], false],
  ['/TOKEN/x', 'GET', '/TOKEN/x', {}, [403], false],
];

async function main() {
  const failures = [];
  hooks.after.httpServer(async () => {
    for (const [name, method, url, opts, statuses, parserAllowed] of cases) {
      global.__probe = [];
      let r;
      try {
        r = await send(method, url, opts);
      } catch (e) {
        failures.push(`${name}: request error ${e.message}`);
        continue;
      }
      await new Promise(res => setTimeout(res, 50));
      const parsed = global.__probe.length > 0;
      const ok = statuses.includes(r.status) && (parserAllowed || !parsed);
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: status ${r.status}, body parser ran: ${parsed}`);
      if (!ok) failures.push(name);
    }
    // Browser flow: /token/<valid> sets the cookie, which then opens / and its CSS
    const t = await send('GET', `/token/${TOKEN}`);
    const cookie = (t.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
    const page = await send('GET', '/', { headers: { Cookie: cookie } });
    const css = await send('GET', '/css/main.css', { headers: { Cookie: cookie } });
    const flowOk = cookie && page.status === 200 && css.status === 200;
    console.log(`${flowOk ? 'ok  ' : 'FAIL'} browser cookie flow: / ${page.status}, /css/main.css ${css.status}`);
    if (!flowOk) failures.push('browser cookie flow');

    console.log(failures.length ? `\n${failures.length} FAILED: ${failures.join('; ')}` : `\nall ${cases.length + 1} checks passed`);
    process.exit(failures.length ? 1 : 0);
  });
  await new Ignitor(fold).appRoot(appRoot).fireHttpServer();
}

main().catch(e => {
  console.error('BOOT FAIL', e);
  process.exit(1);
});
