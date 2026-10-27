'use strict';
// node src/galgebra/test.cjs: run the Galgebra rule checks against the core.
const Core = require('./core.js'), Tests = require('./rule-tests.js');
try { console.log(Tests.run(Core) + ' Galgebra rule checks passed'); }
catch (e) { console.log('FAIL ' + e.message); process.exit(1); }
