import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vectorize, cosine, samples } from '../shared/search.js';
const index = samples.map((sample) => ({
  ...sample,
  vector: vectorize(
    `${sample.title} ${sample.tags.join(' ')} ${sample.description} ${sample.content}`,
  ),
}));
const rank = (query: string) =>
  index
    .map((asset) => ({ title: asset.title, score: cosine(vectorize(query), asset.vector) }))
    .sort((a, b) => b.score - a.score);
test('semantic aliases share a concept dimension', () => {
  assert.ok(cosine(vectorize('login'), vectorize('authentication')) > 0.9);
  assert.ok(cosine(vectorize('login'), vectorize('forest')) < 0.1);
});
test('security query ranks the access-control image first', () => {
  assert.equal(rank('secure login')[0].title, 'Access control architecture');
});
test('customer query retrieves the sample audio transcript', () => {
  assert.equal(rank('customer activation')[0].title, 'Customer onboarding walkthrough');
});
test('empty vectors produce a finite zero similarity', () => {
  assert.equal(cosine(vectorize(''), vectorize('hello')), 0);
  assert.equal(cosine([], []), 0);
});
test('normalised vectors have unit length', () => {
  assert.ok(Math.abs(Math.hypot(...vectorize('test the new project API')) - 1) < 1e-10);
});
