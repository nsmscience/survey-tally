'use strict';
// index.html에서 <script id="tally-logic"> 블록만 꺼내 격리된 vm 환경에서 실행한다.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const HTML_PATH = path.join(__dirname, '..', 'index.html');

function loadLogic() {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const m = html.match(/<script id="tally-logic">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('index.html에 <script id="tally-logic"> 블록이 없습니다.');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(m[1], sandbox, { filename: 'index.html#tally-logic' });
  if (!sandbox.SurveyTally) throw new Error('SurveyTally를 내보내지 않았습니다.');
  return sandbox.SurveyTally;
}

module.exports = { loadLogic, HTML_PATH };
