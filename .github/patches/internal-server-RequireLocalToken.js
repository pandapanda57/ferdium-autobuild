// Added to Ferdium's internal server as the first server middleware (runs before body parsing
// and routing). Rejects any request that does not carry the local server token, so untrusted
// local processes or web pages cannot reach the body parser or router at all.
// Accepted token sources match Ferdium's own route middleware: X-Ferdium-Local-Token header,
// ?token= query, or the ferdium-local-token cookie. /token/<token> (which sets that cookie) is
// validated here too, because Ferdium's own /token route does not check its token reliably.
// The 403 must carry a body: AdonisJS v4 only treats a server-middleware response as final when
// a body is set; an empty response.forbidden() lets the request continue to BodyParser.
const { timingSafeEqual } = require('node:crypto');

const isValid = clientToken => {
  const serverToken = process.env.FERDIUM_LOCAL_TOKEN;
  if (!serverToken || typeof clientToken !== 'string') {
    return false;
  }
  const a = Buffer.from(clientToken, 'utf8');
  const b = Buffer.from(serverToken, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
};

class RequireLocalToken {
  async handle({ request, response }, next) {
    const pathToken = /^\/token\/([^/]+)$/.exec(request.url());
    const clientToken = pathToken
      ? pathToken[1]
      : request.header('X-Ferdium-Local-Token') ||
        request.get().token ||
        request.cookie('ferdium-local-token');

    if (isValid(clientToken)) {
      await next();
      return;
    }

    response.status(403).send('Forbidden');
  }
}

module.exports = RequireLocalToken;
