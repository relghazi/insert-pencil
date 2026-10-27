'use strict';
// node src/paperboy/test.cjs: run the Term Paperboy rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Term Paperboy rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
