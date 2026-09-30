# 허가 자료 후보 작성과 변경 비교

`AI/data_tool.py`는 Python 표준 라이브러리로 실행하는 일회 자료 도구다. 외부 모델, 네트워크 호출, 임의 URL 가져오기, 게시·검수 승인·권한 변경 API가 없다. 계산 금액도 만들지 않으며 금액 계산 권위는 `packages/benefit-core`의 TypeScript 엔진이다.

## 허가 대장과 입력 경계

입력은 권리자가 제공한 비개인 정형 CSV 또는 JSON 규칙 배열이다. 수동으로 정리한 자료를 넣는 경우에도 정확한 원문과 정리 파일을 비공개 증거 저장소에 함께 보관하고 실제 사람이 대조한다. 구조화 파일의 위치는 원문의 해당 문구를 검수했다는 증거가 아니다.

`--ledger`는 아래 세 목록을 가진 JSON이다. `AI/fixtures/source-ledger.json`은 실제 소스 사용권이 없는 가상 개발 예제다.

| 항목 | 내용 |
|---|---|
| `brands`, `products` | 카탈로그 Schema의 브랜드·상품 참조 목록 |
| `sources[].usage` | `CATALOG` 또는 `FIXTURE`; 개인 사용자 작성 규칙은 이 도구에 반입하지 않음 |
| `sources[].source` | `contracts/types.ts`의 Source: URL·문서 버전·확인일·신선도·권리 종료·7개 배포 권리 |
| `sources[].internalPermission` | `allowed: true`, `nonPersonal: true`, 내부 처리 근거의 `evidenceRef` |
| `evidenceRef` | `--evidence-dir` 안에 있는 비어 있지 않은 UTF-8 근거 파일의 상대 경로 |

내부 처리 허가 또는 그 로컬 근거 파일이 없으면 입력 전체를 거절한다. 절대경로·상위경로·밖으로 나가는 심볼릭 링크는 근거로 인정하지 않는다. 근거 파일 내용은 출력하지 않고 SHA-256만 기록한다. 내부 허가와 공개 배포 허가는 서로 별도다.

표시·변환·iOS JSON 배포·Android JSON 배포·오프라인 보존·갱신·철회 권리가 전부 `true`이고 공개 권리 근거 파일이 존재해야 공개 후보용 `draftCatalog`에 들어간다. 권리·신선도 만료도 차단한다. 이 검사는 입력된 대장과 파일의 존재·형식 검사이며 승인자의 권한, 계약 진위 또는 실제 이용권을 검증한 결과가 아니다. 실제 담당자의 권리 확인과 사람 원문 검수는 계속 필요하다.

지갑, 현재 위치·좌표, 거래내역, 영수증, 제보 본문, 카드번호·CVC·인증정보는 반입 대상이 아니다. 허용된 구조 필드만 받고 민감 키, 명시적인 좌표 문자열, 흔한 전화번호·이메일·카드번호 패턴도 거절한다. 패턴 검사는 모든 개인정보를 알아내는 수단이 아니므로 원문 소유자가 먼저 비개인 여부를 확인해야 한다. 임의 자유 서술·제보 파일은 처리하지 않는다. 오류는 코드만 stderr에 기록하고 입력값을 복제하지 않는다.

입력은 최대 5 MiB·규칙 1,000개, 근거 파일은 64 KiB다. JSON 중복 키와 NaN/Infinity는 거절한다. URL은 출처 표시용 HTTPS 문자열이며 접속하지 않는다.

## 후보 작성

저장소 루트에서 다음 두 명령을 실제 실행해 JSON·CSV 개발 예제의 동작을 확인했다. 결과에는 `origin: FIXTURE`, `status: DRAFT`, `disposition: DEVELOPMENT_ONLY`, `draftCatalog: null`, `humanReviewCompleted: false`, `published: false`가 나온다. 예제 권리·기간·조건은 가상 테스트 값이며 실제 상품 데이터가 아니다.

```bash
python3 AI/data_tool.py candidate \
  --input AI/fixtures/rules.json \
  --ledger AI/fixtures/source-ledger.json \
  --evidence-dir AI/fixtures > /tmp/hyetaekpass-ai-json-candidate.json

python3 AI/data_tool.py candidate \
  --input AI/fixtures/rules.csv \
  --ledger AI/fixtures/source-ledger.json \
  --evidence-dir AI/fixtures > /tmp/hyetaekpass-ai-csv-candidate.json
```

JSON은 Rule의 규칙 필드를 가진 배열이며 `origin`, `status`, `review`는 입력할 수 없다. CLI가 대장의 사용 구분과 후보 상태만 명시한다. CSV는 같은 필드명을 헤더로 쓰고 계산 필드는 `calculation.value`처럼 펼친다. 배열은 JSON 배열, 불리언은 `true`/`false`, 금액·비율은 정수로 적는다. CSV의 복합 `calculation` 열은 지원하지 않는다. 빈 CSV 셀은 필드를 생략하며 `[]`, `false`, `0`과 다르다.

정률 `value`는 0~10,000 basis points이고 500은 5%다. 정액·최소금액·상한은 정수 원화다. `basis`, `minimumBasis`, `rounding`, `settlement`, 필요 조건·잔여 한도·횟수 여부·채널·제외·사용 절차·시작/종료를 원문대로 명시해야 한다. 시간은 UTC RFC3339이고 기간은 `[startsAt, endsAt)`이다. 천원당·포인트 등 지원하지 않는 산식은 정률로 바꾸지 않는다. 계산 객체가 없으면 명시적인 `unsupportedReason`이 필요하다. 점포별 근거와 중복 조합은 이 최소 도구에서 지원하지 않으므로 별도 관리 원문 검수 경로를 사용한다.

모르는 반올림·중복·자격·조건·기간을 채우지 않는다. 필수 필드가 비어 있거나 형식·참조가 틀리면 원래 후보를 보존하고 `issues`를 붙이며 `BLOCKED`로 격리한다. 정상 후보도 `DRAFT_READY`일 뿐 사람 검수 또는 게시 완료가 아니다. `draftCatalog`는 조건을 충족한 DRAFT 규칙만 가진 관리 import용 초안이며 후보 보고서 전체를 서버에 import하면 안 된다. `BLOCKED`·`DEVELOPMENT_ONLY` 후보는 그 카탈로그에 포함되지 않는다.

`fieldEvidence`는 입력 CSV의 레코드·마지막 물리 행·열 또는 JSON Pointer, 원본 파일 SHA-256, sourceId·URL·문서 버전·확인일을 필드별로 기록한다. 여러 줄 CSV 값은 레코드 번호와 종료 행을 함께 사용한다. 입력·대장·근거 파일을 해당 해시로 다시 찾을 수 있게 비공개 보관해야 한다. 원문 안의 “게시해라” 같은 문자열은 정형 필드의 데이터로만 남고 실행되지 않는다.

## 변경 비교와 수동 경로

```bash
python3 AI/data_tool.py diff \
  --before /tmp/hyetaekpass-ai-json-candidate.json \
  --after /tmp/hyetaekpass-ai-csv-candidate.json
```

비교 결과는 변경 경로와 두 파일의 SHA-256을 기록한다. 필드 의미가 같아도 출처 위치·원본 해시가 달라지면 근거 변경으로 표시한다. `UNCHANGED`는 두 후보의 비교 결과일 뿐 소스에 다시 접근해 정상 확인한 결과가 아니다. 항상 `sourceRechecked: false`이며 확인일이나 기존 승인을 갱신하지 않는다. 접근 실패를 무변경으로 기록해서는 안 된다.

수동 경로는 동일 JSON 필드를 실제 담당자가 작성 → 권리 대장과 원문 위치 기록 → `candidate` 형식 검사 → 작성자 외 실제 사람의 원문 대조 → TypeScript 경계·조건·조합 검사 → 관리 도구의 검수·게시 순서다. 원문·권리·후보 변경은 새 초안과 재검수가 필요하다. AI 에이전트 코드 검사는 독립 사람 원문 검수가 아니다. 실제 검수자를 확보하지 못하면 고위험 사전 탑재 계산의 공개를 보류한다.

## 전체 시간 기록

`record-time`은 작성·수정·원문 대조·실제 사람 검수 시간을 모두 더한다. `--review-status pending`은 검수 미완료를 뜻하며 시간 기록은 승인 증거로 사용하지 않는다. `human-complete`는 실제 독립 사람이 검수를 마친 뒤에만 운영자가 기록하며 이 CLI가 검수를 수행하는 것은 아니다.

아래 숫자는 명령 형식 설명용이며 실제 측정 결과가 아니다. 실제 측정한 값으로 바꾼다. 시간 로그는 개인정보 없는 과업 코드로 비공개 저장한다.

```bash
python3 AI/data_tool.py record-time \
  --log /tmp/hyetaekpass-ai-time.jsonl --case first-rule --mode manual \
  --draft-minutes 3 --correction-minutes 0 --source-check-minutes 4 \
  --review-minutes 0 --review-status pending
```

같은 과업에 `--mode assisted` 기록도 남긴다. 양 경로의 실제 사람 검수가 모두 완료됐을 때만 합계 시간을 비교한다. 보조 경로가 수동보다 짧지 않으면 `HOLD_ASSISTED`, 측정·검수가 부족하면 `MEASUREMENT_PENDING`을 출력한다. 작성 속도만 빠르다는 이유로 도입하지 않는다. 아직 실제 소스·사람으로 전체 시간 절감을 측정하지 않았다.

## 실제 검증

Python 3.14.5에서 다음 표준 unittest 명령이 18개 검사를 통과했다. 검사에는 각 배포 권리 누락, 내부 허가·근거 실패, 필수 조건 미생성, bp 상한·원화 정수·정산, 만료·참조·검수 사칭, 개발 자료 격리·빈 자료, 개인정보 거절, 정형 원문 지시의 데이터 취급, CSV 위치 근거·큰 셀 오류, 변경·해시, 전체 검수 시간 비교와 잘못된 시간 로그의 변경 방지가 포함된다. 테스트 속의 사람 완료 기록과 계약 근거는 가상 사례다.

```bash
python3 -m unittest discover -s AI/tests
```

가상 예제 CLI와 로컬 검사를 실제 데이터 이용권·원문 검수·배포 승인·운영 실측의 증거로 바꾸지 않는다. 이 도구에는 새 Python 의존성, 상시 서비스, 벡터 DB, 외부 AI 비용이 없다.
