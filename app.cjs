/**
 * cPanel / LiteSpeed entry (CommonJS).
 * Setup Node.js App → Application startup file: app.cjs
 *
 * LiteSpeed uses require() — ESM app.js fails with ERR_REQUIRE_ESM.
 */
module.exports = require('./server/index.cjs')
