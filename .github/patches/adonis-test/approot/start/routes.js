// Test copy of Ferdium's routes.js: same token middleware and route shapes, inline handlers.
const { timingSafeEqual } = require('node:crypto');

const Route = use('Route');
const API_VERSION = 'v1';

async function validateToken(clientToken, response, next) {
  const serverToken = process.env.FERDIUM_LOCAL_TOKEN;
  const valid =
    serverToken &&
    clientToken &&
    timingSafeEqual(
      Buffer.from(clientToken, 'utf8'),
      Buffer.from(serverToken, 'utf8'),
    );
  if (valid) {
    await next();
    return true;
  }
  return response.forbidden();
}

const OnlyAllowFerdium = async ({ request, response }, next) => {
  const version = request.header('X-Franz-Version');
  if (!version) {
    return response.forbidden();
  }
  const clientToken = request.header('X-Ferdium-Local-Token');
  return validateToken(clientToken, response, next);
};

const RequireTokenInQS = async ({ request, response }, next) => {
  const clientToken = request.get().token;
  return validateToken(clientToken, response, next);
};

const FERDIUM_LOCAL_TOKEN_COOKIE = 'ferdium-local-token';

const RequireAuthenticatedBrowser = async ({ request, response }, next) => {
  const clientToken = request.cookie(FERDIUM_LOCAL_TOKEN_COOKIE);
  return validateToken(clientToken, response, next);
};

const hit = name => () => {
  global.__handlers.push(name);
  return { handler: name };
};

Route.get('health', hit('health')).middleware(OnlyAllowFerdium);

Route.group(() => {
  Route.get('me', hit('me'));
  Route.put('service/:id', hit('service-edit'));
})
  .prefix(API_VERSION)
  .middleware(OnlyAllowFerdium);

Route.group(() => {
  Route.get('icon/:id', hit('icon'));
})
  .prefix(API_VERSION)
  .middleware(RequireTokenInQS);

Route.group(() => {
  Route.post('import', hit('import-post'));
  Route.get('import', hit('import-page'));
  Route.post('transfer', hit('transfer-post'));
  Route.get('/', hit('index'));
}).middleware(RequireAuthenticatedBrowser);

Route.get('token/:token', ({ params: { token }, response }) => {
  if (validateToken(token)) {
    response.cookie(FERDIUM_LOCAL_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: true,
      path: '/',
    });
    return response.redirect('/');
  }
  return response.forbidden();
});
