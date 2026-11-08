// Test-only global middleware placed right after BodyParser: records that body parsing ran.
class Probe {
  async handle({ request }, next) {
    global.__probe.push({
      url: request.url(),
      method: request.method(),
      files: Object.keys(request._files || {}),
      body: Object.keys(request.body || {}),
    });
    await next();
  }
}
module.exports = Probe;
