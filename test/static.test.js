'use strict';
// index.html이 외부 자원·네트워크·저장 API를 쓰지 않는지 정적으로 확인한다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { HTML_PATH } = require('./load-logic');

const html = fs.readFileSync(HTML_PATH, 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');

test('외부 파일을 불러오지 않는다 (src·href·@import·url())', () => {
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc\s*=/i);
  assert.doesNotMatch(html, /<link\b/i);
  assert.doesNotMatch(html, /@import|@font-face|url\s*\(/i);
  assert.doesNotMatch(html, /<(img|iframe|object|embed|audio|video|source|form)\b/i);
  assert.doesNotMatch(html, /\b(https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/i);
});

test('네트워크·저장 API를 쓰지 않는다', () => {
  const banned = [
    'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon', 'RTCPeerConnection',
    'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'caches', 'serviceWorker',
    'BroadcastChannel', 'SharedWorker', 'Worker', 'postMessage', 'window.open', 'eval', 'Function(',
  ];
  for (const word of banned) {
    assert.ok(!scripts.includes(word), `${word} 사용 금지`);
  }
});

test('CSP로 외부 연결을 막는다', () => {
  const m = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
  assert.ok(m, 'CSP 메타 태그 없음');
  const csp = m[1];
  for (const d of ["default-src 'none'", "connect-src 'none'", "form-action 'none'"]) {
    assert.ok(csp.includes(d), `CSP에 ${d} 없음`);
  }
});

test('입력란은 자동완성·맞춤법 검사를 끈다', () => {
  const m = html.match(/<textarea\b[^>]*>/);
  assert.ok(m);
  assert.match(m[0], /autocomplete="off"/);
  assert.match(m[0], /spellcheck="false"/);
});

test('계산 로직 블록은 DOM에 기대지 않는다', () => {
  const logic = html.match(/<script id="tally-logic">([\s\S]*?)<\/script>/)[1];
  assert.doesNotMatch(logic, /\b(document|window)\b/);
});

test('결과 표 머리글 순서', () => {
  const heads = [...html.matchAll(/<th scope="col">([^<]+)<\/th>/g)].map((m) => m[1]);
  assert.deepEqual(heads, ['문항', '유효 응답', '평균', '빈 응답', '제외']);
});

test('.nojekyll이 저장소 맨 위에 빈 파일로 있다', () => {
  const p = path.join(__dirname, '..', '.nojekyll');
  assert.ok(fs.existsSync(p), '.nojekyll 없음');
  assert.equal(fs.statSync(p).size, 0);
});
