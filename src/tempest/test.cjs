'use strict';
// node src/centigrade/test.cjs: run the Testpest rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Testpest rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
