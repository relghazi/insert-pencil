'use strict';
// node src/donkeykong/test.cjs: run the Dunce Kong rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Dunce Kong rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
