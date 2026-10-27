'use strict';
// node src/breakout/test.cjs: run the Detention Breakout rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Detention Breakout rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
