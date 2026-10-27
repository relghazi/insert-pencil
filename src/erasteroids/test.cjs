'use strict';
// node src/erasteroids/test.cjs: run the Erasteroids rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Erasteroids rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
