'use strict';
// node src/joust/test.cjs: run the Jock Joust rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Jock Joust rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
