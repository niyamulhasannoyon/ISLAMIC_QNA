import assert from 'node:assert';
import { reciprocalRankFusion } from '../rrf';

console.log('Running RRF unit test suite...');

// Test 1: Both lists present
const lexical = [
  { id: 'doc1', title: 'Doc 1' },
  { id: 'doc2', title: 'Doc 2' },
  { id: 'doc3', title: 'Doc 3' },
];

const semantic = [
  { id: 'doc2', title: 'Doc 2' },
  { id: 'doc4', title: 'Doc 4' },
  { id: 'doc1', title: 'Doc 1' },
];

const fused = reciprocalRankFusion(lexical, semantic, { k: 60 });

// doc2: rank 2 in lex (1/62) + rank 1 in sem (1/61) = 0.016129 + 0.016393 = 0.032522
// doc1: rank 1 in lex (1/61) + rank 3 in sem (1/63) = 0.016393 + 0.015873 = 0.032266
assert.strictEqual(fused[0].id, 'doc2', 'doc2 should be rank 1');
assert.strictEqual(fused[1].id, 'doc1', 'doc1 should be rank 2');
assert.strictEqual(fused[0].debug?.lexicalRank, 2, 'doc2 lexical rank should be 2');
assert.strictEqual(fused[0].debug?.semanticRank, 1, 'doc2 semantic rank should be 1');

// Test 2: Fallback when semantic list is empty
const lexOnly = reciprocalRankFusion(lexical, [], { k: 60 });
assert.strictEqual(lexOnly.length, 3, 'lexOnly should contain 3 items');
assert.strictEqual(lexOnly[0].id, 'doc1', 'doc1 should stay rank 1');
assert.strictEqual(lexOnly[0].debug?.semanticRank, null, 'semanticRank should be null');

console.log('✓ All RRF unit tests passed successfully!');
