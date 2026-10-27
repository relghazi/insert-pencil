'use strict';
// node src/burgertime/test.cjs: run the Home Ec Scramble rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Home Ec Scramble rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
