'use strict';
// node src/qix/test.cjs: run the Quiz rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Quiz rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
