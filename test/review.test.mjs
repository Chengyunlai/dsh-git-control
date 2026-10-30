import test from 'node:test';
import assert from 'node:assert/strict';
import { apply } from '../index.js';

function harness({ accepted = true } = {}) {
  const routes = new Map();
  const creates = [], prompts = [];
  apply({
    effect: () => {},
    workspaceRegistry: { list: async () => [{ id: 'workspace-demo', path: '/demo' }] },
    sessionController: {
      create: async (request) => { creates.push(request); return { sessionId: request.sessionId }; },
      prompt: async (request) => { prompts.push(request); return { accepted }; },
    },
    connection: { fetch: { register: (route) => routes.set(route.path, route.fetch) } },
  });
  return { creates, prompts, send: (body) => routes.get('/api/git.review')(new Request('http://localhost/api/git.review', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })) };
}

test('review creates distinct workspace conversations without an existing conversation or file', async () => {
  const h = harness();
  for (let i = 0; i < 2; i++) {
    const response = await h.send({ cwd: '/demo', text: 'Review the project\n\nGit: .' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ok, true);
  }
  assert.notEqual(h.creates[0].sessionId, h.creates[1].sessionId);
  assert.equal(h.creates[0].workspaceId, 'workspace-demo');
  assert.equal(h.prompts[0].content[0].text, 'Review the project\n\nGit: .');
  assert.equal(h.prompts[0].sessionId, h.creates[0].sessionId);
});

test('invalid workspace and blank or oversized suggestions create no conversation', async () => {
  const h = harness();
  for (const body of [{ cwd: '/other', text: 'review' }, { cwd: '/demo', text: '  ' }, { cwd: '/demo', text: 'a'.repeat(8193) }]) {
    assert.ok((await h.send(body)).status >= 400);
  }
  assert.equal(h.creates.length, 0);
});

test('rejected admission returns the created conversation for recovery', async () => {
  const h = harness({ accepted: false });
  const result = await (await h.send({ cwd: '/demo', text: 'review' })).json();
  assert.equal(result.ok, false);
  assert.equal(result.sessionId, h.creates[0].sessionId);
});
