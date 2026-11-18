# 설문 집계기 계획서

## 목표

엑셀에서 머리글 줄까지 복사해 붙여넣으면 문항별 결과 표를 보여 주는 단일 페이지(`index.html`)를 만든다.

## 제약

- 파일 하나(`index.html`)로 동작한다. 외부 라이브러리·외부 글꼴·분석 도구를 쓰지 않는다.
- 붙여넣은 데이터는 브라우저 밖으로 보내지 않고 어디에도 저장하지 않는다.
  - 네트워크 요청 코드(`fetch`, `XMLHttpRequest` 등)와 저장 API(`localStorage`, `sessionStorage`, `indexedDB`, 쿠키)를 쓰지 않는다.
  - Content-Security-Policy 메타 태그로 외부 연결을 막는다 (`default-src 'none'`, `connect-src 'none'`, `form-action 'none'`).
  - 입력란은 `autocomplete="off"`, `spellcheck="false"`.
- 저장소 맨 위에 빈 `.nojekyll` 파일을 둔다 (GitHub Pages가 Jekyll 처리 없이 그대로 내보내도록).

## 집계 규칙

1. 입력은 엑셀이 클립보드에 넣는 탭 구분 텍스트(TSV)다. 줄바꿈은 `\r\n`·`\n`·`\r` 모두 받는다.
   엑셀이 따옴표로 감싼 칸(칸 안에 줄바꿈·탭이 있을 때)도 올바르게 읽는다.
2. 첫 줄은 머리글이다. 첫 열(응답번호)은 집계하지 않고, 둘째 열부터가 문항이다.
3. 칸 판정 — 앞뒤 공백을 지운 값이
   - `1`·`2`·`3`·`4`·`5` 중 하나면 **유효**,
   - 비었거나 공백만 있으면 **빈 응답**,
   - 그 밖의 값(`6`, `3.0`, `１`, `아니오` …)은 **제외**.
4. 칸 수가 머리글보다 모자란 줄은 모자란 칸을 빈 응답으로 센다.
5. 결과 표 열: 문항 / 유효 응답 / 평균 / 빈 응답 / 제외.
6. 평균 = 유효 응답의 합 ÷ 유효 응답 수, 소수 셋째 자리에서 반올림해 둘째 자리까지 (`4` → `4.00`).
   유효가 0이면 `-`. 부동소수 오차가 없도록 정수 연산으로 반올림한다.

### 명세에 없어 정한 것

- 붙여넣은 글 끝의 빈 줄(엑셀이 붙이는 마지막 줄바꿈 포함)은 응답 줄로 치지 않는다.
  중간에 낀 빈 줄은 "칸이 모자란 줄"로 보고 모든 문항을 빈 응답으로 센다.
- 머리글보다 칸이 많은 줄의 남는 칸은 대응하는 문항이 없으므로 무시한다.
- 머리글 이름이 비어 있으면 표에 `(열 N)`으로 표시한다.
- 입력이 비었거나 문항 열이 없으면 표 대신 안내 문구를 보여 준다.

## 구조

- `index.html`
  - `<script id="tally-logic">` — 화면과 무관한 순수 함수만 둔다 (`parseTsv`, `classifyCell`, `formatAverage`, `tally`).
    DOM을 건드리지 않으며 `globalThis.SurveyTally`로 내보낸다.
  - `<script id="tally-ui">` — 입력란·버튼·결과 표만 다룬다. 계산은 `SurveyTally.tally`에 맡긴다.
- `test/tally.test.js` — Node 내장 `node:test`로 `index.html`에서 `tally-logic` 스크립트를 꺼내
  `vm`에서 실행해 시험한다. 의존 패키지 없음.
- `test/static.test.js` — `index.html`에 외부 URL·네트워크·저장 API가 없는지, `.nojekyll`이 비어 있는지 확인한다.
- `package.json` — `npm test` = `node --test`.

## 작업 순서 (작업마다 커밋)

1. 계획서와 `.nojekyll` 추가
2. 계산 로직과 시험 추가
3. 화면 추가
4. 정적 검사 시험 추가
5. README 정리
6. 시험 통과 확인 후 PR
