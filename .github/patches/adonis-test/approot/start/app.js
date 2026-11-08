// Test app providers, resolved from the Ferdium checkout's node_modules (ADONIS_DEPS) so this
// works with pnpm's non-hoisted layout.
const deps = process.env.ADONIS_DEPS;
const resolve = m => require.resolve(m, { paths: [deps] });

module.exports = {
  providers: [
    resolve('@adonisjs/framework/providers/AppProvider'),
    resolve('@adonisjs/bodyparser/providers/BodyParserProvider'),
  ],
  aceProviders: [],
  aliases: {},
  commands: [],
};
