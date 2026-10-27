'use strict';
// node src/centigrade/test.cjs: run the Centigrade rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Centigrade rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
