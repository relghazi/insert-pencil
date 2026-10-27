'use strict';
// node src/battlezone/test.cjs: run the Recess Zone rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Recess Zone rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
