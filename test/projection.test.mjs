import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProjectionAdapter, deriveView, formatUpdatedAt, emptyView } from '../src/projection.mjs';

const T = (content, status) => ({ content, status });

test('deriveView：active 可 >1 全部高亮，currentStep=第一个 in_progress（§0.1-1）', () => {
  const v = deriveView([T('a', 'completed'), T('b', 'in_progress'), T('c', 'in_progress'), T('d', 'pending')]);
  assert.equal(v.total, 4); assert.equal(v.done, 1); assert.equal(v.active, 2); assert.equal(v.pending, 1);
  assert.deepEqual(v.activeIndexes, [2, 3]); assert.equal(v.currentStep, 2);
  assert.deepEqual(v.items.map((i) => i.content), ['a', 'b', 'c', 'd']); // AC-R2-2 逐字直传
});

test('AC-R2-3：done/active/pending 与 progressLabel 口径一致（4 项 2 完成 1 进行）', () => {
  const v = deriveView([T('x', 'completed'), T('y', 'completed'), T('z', 'in_progress'), T('w', 'pending')]);
  assert.equal(v.done, 2); assert.equal(v.active, 1); assert.equal(v.pending, 1); assert.equal(v.done + v.active + v.pending, v.total);
});

test('asOfSeq 去重/乱序拒绝（§1.3），不进视图字段', () => {
  const a = createProjectionAdapter();
  a.applyFrame({ todos: [T('a', 'pending')], asOfSeq: 10 });
  const dup = a.applyFrame({ todos: [T('a', 'completed')], asOfSeq: 10 });
  assert.equal(dup.accepted, false); assert.equal(dup.reason, 'stale-or-dup');
  const stale = a.applyFrame({ todos: null, asOfSeq: 9 });
  assert.equal(stale.accepted, false);
  assert.equal(a.view().done, 0); // 被拒帧不改视图
});

test('中断误报防护：会话从开始就 null → 永不判中断（§1.2）', () => {
  const a = createProjectionAdapter();
  a.applyFrame({ todos: null, asOfSeq: 1 });
  a.applyFrame({ todos: null, asOfSeq: 2 });
  assert.equal(a.view().interrupted, false); assert.equal(a.view().empty, true);
});

test('interrupted 边沿：非null含 in_progress → null 边沿才判；新 todo/write 帧恢复', () => {
  const a = createProjectionAdapter();
  a.applyFrame({ todos: [T('a', 'in_progress')], asOfSeq: 3 });
  assert.equal(a.view().interrupted, false);
  a.applyFrame({ todos: null, asOfSeq: 4 });
  assert.equal(a.view().interrupted, true);
  a.applyFrame({ todos: [T('a', 'in_progress')], asOfSeq: 5 });
  assert.equal(a.view().interrupted, false);
});

test('turn/end 保留帧不误判（帧序 3→4null→…仅在边沿上判一次）；上一帧无 in_progress 的 null 不判', () => {
  const a = createProjectionAdapter();
  a.applyFrame({ todos: [T('a', 'completed')], asOfSeq: 3 });
  a.applyFrame({ todos: null, asOfSeq: 4 });
  assert.equal(a.view().interrupted, false); // 完成的清单清空 ≠ 中断
});

test('AC-R2-4：非法帧整体空态，不报错不白屏', () => {
  const a = createProjectionAdapter();
  const r = a.applyFrame({ todos: [{ content: 'x', status: 'doing' }], asOfSeq: 7 });
  assert.equal(r.accepted, false); assert.equal(r.view.empty, true);
  const r2 = a.applyFrame({ todos: 'not-array', asOfSeq: 8 });
  assert.equal(r2.view.empty, true);
});

test('updatedAt 只展示「N 分钟前」不参与计算', () => {
  const base = 1_700_000_000_000;
  assert.equal(formatUpdatedAt(base + 30_000, base), '刚刚');
  assert.equal(formatUpdatedAt(base + 5 * 60_000, base), '5 分钟前');
  assert.equal(formatUpdatedAt(base + 150 * 60_000, base), '2 小时前');
});

test('空态文案走 no-todo-this-turn（AC-R2-4 触发指引由 UI 层加）', () => {
  assert.equal(emptyView('no-todo-this-turn').reason, 'no-todo-this-turn');
});
