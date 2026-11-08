'use strict';
// node src/digdug/test.cjs: run the Dig Doug rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Dig Doug rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
