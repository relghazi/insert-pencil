'use strict';
// node src/robotron/test.cjs: run the Robotron: Class of 2084 rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Robotron: Class of 2084 rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
