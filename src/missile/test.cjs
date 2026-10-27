'use strict';
// node src/missile/test.cjs: run the Spitball Command rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Spitball Command rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
