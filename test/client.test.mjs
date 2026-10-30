import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

test('project review works before selecting a file and opens the new conversation', async () => {
  let plugin, Panel, cursor = 0;
  const state = [], sent = [], opened = [];
  const React = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useState: (initial) => { const i = cursor++; state[i] ??= typeof initial === 'function' ? initial() : initial; return [state[i], (value) => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
    useEffect: () => {}, useCallback: (fn) => fn, useMemo: (fn) => fn(), useRef: () => ({ current: null }),
  };
  vm.runInNewContext(readFileSync(new URL('../client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load: (spec) => { plugin = spec.factory(() => React); } } },
    fetch: async (url, options) => { sent.push(JSON.parse(options.body)); return { ok: true, json: async () => ({ ok: true, sessionId: 'session-new' }) }; },
    AbortController, Set, Map, console,
  });
  plugin.apply({
    effect: () => {}, locale: { register: () => {}, bind: () => (key, vars) => key + (vars ? JSON.stringify(vars) : '') },
    uiWorkspace: { openSession: (id) => opened.push(id) },
    slots: { inject: (name, fn) => fn(), register: (spec, component) => { if (spec.name === 'main') Panel = component; } },
  });
  const inner = Panel({ useWorkspaces: (select) => select({ items: [{ workspaceId: 'demo', path: '/demo' }] }), useSessions: (select) => select({ byId: {} }), t: (key, vars) => key + (vars ? JSON.stringify(vars) : '') });
  const render = () => { cursor = 0; return inner.type(inner.props); };
  const nodes = (node) => !node || typeof node !== 'object' ? [] : [node, ...(node.children ?? []).flat(Infinity).flatMap(nodes)];
  let tree = render();
  const button = nodes(tree).find((node) => node.type === 'button' && node.children.includes('review.button'));
  assert.ok(button);
  button.props.onClick();
  tree = render();
  const composer = nodes(tree).find((node) => node.type?.name === 'ReviewComposer');
  assert.ok(composer);
  await composer.props.onSubmit('Please review');
  assert.equal(sent[0].cwd, '/demo');
  assert.ok(sent[0].text.startsWith('Please review'));
  assert.ok(!sent[0].text.includes('```diff'));
  assert.deepEqual(opened, ['session-new']);
});
