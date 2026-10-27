'use strict';
// node src/qbert/test.cjs: run the Q*Nerd rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Q*Nerd rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
