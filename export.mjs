import { readFileSync, writeFileSync } from 'node:fs';
import { makeSupportBundle } from './src/bundle-export.mjs';
const records = JSON.parse(readFileSync(process.argv[2], 'utf8'));
writeFileSync(process.argv[3], makeSupportBundle(records));
