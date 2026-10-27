'use strict';
// node src/frogger/test.cjs: run the Froggology rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Froggology rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
