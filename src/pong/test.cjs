'use strict';
// node src/pong/test.cjs: run the Gym Class Pong rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Gym Class Pong rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
