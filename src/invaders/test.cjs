'use strict';
// node src/invaders/test.cjs: run the Space Substitutes rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Space Substitutes rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
