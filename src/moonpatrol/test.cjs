'use strict';
// node src/moonpatrol/test.cjs: run the Hall Patrol rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Hall Patrol rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
