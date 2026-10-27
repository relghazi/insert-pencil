'use strict';
// node src/pacman/test.cjs: run the Snack-Man rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Snack-Man rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
