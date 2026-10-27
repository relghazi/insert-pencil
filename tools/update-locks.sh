#!/bin/sh
# Rebuild and set the locked HTML hashes (build/manifest.json, work/v045-integration/core-checks.json) to the new build.
# Run only after an owner-approved change; then run npm test.
set -e
node build/build.cjs --html-only >/dev/null
node -e "
const fs=require('fs'),{sha256,contentSha256}=require('./build/lib.cjs');
let f='build/manifest.json',m=JSON.parse(fs.readFileSync(f)),html=fs.readFileSync('dist/'+m.output,'utf8');
m.lockedSha256=sha256(html);m.lockedContentSha256=contentSha256(html);fs.writeFileSync(f,JSON.stringify(m,null,2)+'\n');
f='work/v045-integration/core-checks.json';const c=JSON.parse(fs.readFileSync(f));c.sha256=m.lockedSha256;c.bytes=Buffer.byteLength(html);fs.writeFileSync(f,JSON.stringify(c,null,2));
console.log('locked',m.lockedSha256,c.bytes);"
