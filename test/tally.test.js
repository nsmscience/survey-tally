'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadLogic } = require('./load-logic');

const { parseTsv, classifyCell, formatAverage, tally } = loadLogic();

// vm 안에서 만든 배열·객체는 다른 realm이라 deepStrictEqual 전에 JSON으로 옮긴다.
const plain = (v) => JSON.parse(JSON.stringify(v));

function summary(text) {
  const r = tally(text);
  assert.equal(r.ok, true, r.message);
  return plain(r.questions).map((q) => [q.name, q.valid, q.average, q.blank, q.excluded]);
}

test('classifyCell: 앞뒤 공백을 지운 1~5만 유효', () => {
  for (const v of ['1', '2', '3', '4', '5', ' 3 ', '\t5', '4 ', '　2　']) {
    assert.equal(classifyCell(v).kind, 'valid', JSON.stringify(v));
  }
  assert.equal(classifyCell(' 4 ').score, 4);
});

test('classifyCell: 비었거나 공백뿐이면 빈 응답', () => {
  for (const v of ['', ' ', '   ', ' ', '　', null, undefined]) {
    assert.equal(classifyCell(v).kind, 'blank', JSON.stringify(v));
  }
});

test('classifyCell: 그 밖의 값은 제외', () => {
  for (const v of ['0', '6', '10', '3.0', '3.5', '-1', '+3', '03', '１', '３', '3점', 'a', '아니오', '"3"', '3 4', 'NaN']) {
    assert.equal(classifyCell(v).kind, 'excluded', JSON.stringify(v));
  }
});

test('formatAverage: 소수 셋째 자리에서 반올림해 둘째 자리까지', () => {
  assert.equal(formatAverage(0, 0), '-');
  assert.equal(formatAverage(4, 1), '4.00');
  assert.equal(formatAverage(7, 2), '3.50');
  assert.equal(formatAverage(10, 3), '3.33'); // 3.333…
  assert.equal(formatAverage(11, 3), '3.67'); // 3.666…
  assert.equal(formatAverage(5, 3), '1.67');  // 1.666…
  // 정확히 …5에서 끝나면 올림 (부동소수로는 틀리기 쉬운 경우)
  assert.equal(formatAverage(1005, 1000), '1.01'); // 1.005
  assert.equal(formatAverage(2345, 1000), '2.35'); // 2.345
  assert.equal(formatAverage(4115, 1000), '4.12'); // 4.115
  assert.equal(formatAverage(17, 8), '2.13');      // 2.125
  assert.equal(formatAverage(1004, 1000), '1.00'); // 1.004
  assert.equal(formatAverage(5, 1), '5.00');
});

test('parseTsv: 줄바꿈 종류와 끝의 빈 줄', () => {
  assert.deepEqual(plain(parseTsv('a\tb\r\n1\t2\r\n')), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(plain(parseTsv('a\tb\n1\t2')), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(plain(parseTsv('a\tb\r1\t2\r')), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(plain(parseTsv('a\tb\n1\t2\n\n  \n')), [['a', 'b'], ['1', '2']]);
  assert.deepEqual(plain(parseTsv('﻿a\tb')), [['a', 'b']]);
  assert.deepEqual(plain(parseTsv('')), []);
  assert.deepEqual(plain(parseTsv('\n\n')), []);
});

test('parseTsv: 끝의 빈 칸은 유지', () => {
  assert.deepEqual(plain(parseTsv('a\tb\tc\n1\t\t\n')), [['a', 'b', 'c'], ['1', '', '']]);
});

test('parseTsv: 엑셀이 따옴표로 감싼 칸', () => {
  const text = '번호\t"만족도\n(1~5)"\t"말 ""그대로"""\n1\t4\t5\n';
  assert.deepEqual(plain(parseTsv(text)), [
    ['번호', '만족도\n(1~5)', '말 "그대로"'],
    ['1', '4', '5'],
  ]);
  // 칸 중간의 따옴표는 그냥 글자
  assert.deepEqual(plain(parseTsv('a\tb\n1\t3"\n')), [['a', 'b'], ['1', '3"']]);
});

test('tally: 첫 열(응답번호)은 집계하지 않는다', () => {
  const text = '응답번호\tQ1\n1\t5\n2\t3\n';
  const r = summary(text);
  assert.deepEqual(r, [['Q1', 2, '4.00', 0, 0]]);
});

test('tally: 유효·빈 응답·제외를 문항별로 센다', () => {
  const text = [
    '응답번호\tQ1\tQ2\tQ3',
    '1\t5\t \t6',
    '2\t 4 \t\t아니오',
    '3\t3\t2\t',
    '4\tx\t1\t5',
  ].join('\r\n') + '\r\n';
  assert.deepEqual(summary(text), [
    ['Q1', 3, '4.00', 0, 1],
    ['Q2', 2, '1.50', 2, 0],
    ['Q3', 1, '5.00', 1, 2],
  ]);
});

test('tally: 칸이 모자란 줄은 모자란 칸을 빈 응답으로 센다', () => {
  const text = '번호\tQ1\tQ2\tQ3\n1\t5\n2\n3\t1\t2\t3\n';
  assert.deepEqual(summary(text), [
    ['Q1', 2, '3.00', 1, 0],
    ['Q2', 1, '2.00', 2, 0],
    ['Q3', 1, '3.00', 2, 0],
  ]);
});

test('tally: 중간의 빈 줄은 모든 문항이 빈 응답인 줄', () => {
  const text = '번호\tQ1\tQ2\n1\t5\t4\n\n3\t3\t2\n';
  const r = tally(text);
  assert.equal(r.responseCount, 3);
  assert.deepEqual(summary(text), [
    ['Q1', 2, '4.00', 1, 0],
    ['Q2', 2, '3.00', 1, 0],
  ]);
});

test('tally: 머리글보다 많은 칸은 무시한다', () => {
  const text = '번호\tQ1\n1\t5\t9\t9\n';
  assert.deepEqual(summary(text), [['Q1', 1, '5.00', 0, 0]]);
});

test('tally: 유효 응답이 0이면 평균은 "-"', () => {
  const text = '번호\tQ1\tQ2\n1\t\tN/A\n2\t \t0\n';
  assert.deepEqual(summary(text), [
    ['Q1', 0, '-', 2, 0],
    ['Q2', 0, '-', 0, 2],
  ]);
});

test('tally: 머리글만 있으면 모든 문항 0건', () => {
  assert.deepEqual(summary('번호\tQ1\tQ2\r\n'), [
    ['Q1', 0, '-', 0, 0],
    ['Q2', 0, '-', 0, 0],
  ]);
});

test('tally: 빈 머리글 이름은 (열 N)', () => {
  assert.deepEqual(summary('번호\t\t Q3 \n1\t2\t3\n'), [
    ['(열 2)', 1, '2.00', 0, 0],
    ['Q3', 1, '3.00', 0, 0],
  ]);
});

test('tally: 입력이 비었거나 문항 열이 없으면 오류', () => {
  assert.equal(tally('').error, 'empty');
  assert.equal(tally('  \n\n').error, 'empty');
  assert.equal(tally('응답번호\n1\n2\n').error, 'no-questions');
});

test('tally: 반올림 경계를 실제 데이터로 확인 (2.125 → 2.13)', () => {
  // 5,2,2,2,2,2,1,1 → 합 17 / 8 = 2.125
  const lines = ['번호\tQ'];
  [5, 2, 2, 2, 2, 2, 1, 1].forEach((v, i) => lines.push(`${i + 1}\t${v}`));
  assert.deepEqual(summary(lines.join('\n')), [['Q', 8, '2.13', 0, 0]]);
});

test('tally: 응답이 많아도 정확', () => {
  const lines = ['번호\tQ1\tQ2'];
  let sum = 0;
  for (let i = 1; i <= 3000; i++) {
    const v = (i % 5) + 1;
    sum += v;
    lines.push(`${i}\t${v}\t${i % 7 === 0 ? '' : 'x'}`);
  }
  const r = plain(tally(lines.join('\r\n')));
  assert.equal(r.responseCount, 3000);
  assert.equal(r.questions[0].valid, 3000);
  assert.equal(r.questions[0].average, formatAverage(sum, 3000));
  assert.equal(r.questions[0].average, '3.00');
  assert.equal(r.questions[1].blank, 428);
  assert.equal(r.questions[1].excluded, 2572);
});
