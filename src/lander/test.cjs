'use strict';
// node src/lander/test.cjs: run the Lunch Lander rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Lunch Lander rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
