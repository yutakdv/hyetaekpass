# 검증판 계약 v1

금액은 0~1,000,000,000 integer KRW, 비율은 0~10,000 basis points. UTC RFC3339 시각, 적용기간 [startsAt, endsAt), KST 기준월 YYYY-MM. 종료일이 2026-09-30이면 endsAt=2026-09-30T15:00:00Z. Schema/semantics=1. UNKNOWN은 숫자0이나 FALSE로 대체하지 않는다. 공식 검수 CATALOG_REVIEWED는 실제 적용 USER_CONFIRMED_APPLIED와 다르다.

| Method/path | request → response |
|---|---|
| GET /v1/bootstrap | Bootstrap(contracts/types.ts); 복구 미확인시 503 |
| GET /v1/catalog/{releaseId} | 불변 Catalog JSON, bootstrap 바이트수/SHA256와 동일 |
| POST /v1/reports | {ruleId?:string,category:string,message:string} → 201 {id,deleteToken}; 본문≤2000, 토큰32바이트 이상 |
| DELETE /v1/reports/{id} | Authorization: Bearer deletion-token → 204; DB에는 SHA256만 저장 |
| GET /v1/admin/catalogs | 초안·검수·릴리스 목록 |
| POST /v1/admin/import | Catalog → {id,status:'DRAFT'}; AI/import는 게시 못함 |
| PATCH /v1/admin/catalogs/{id} | Catalog 초안 수정; 모든 이전 검수 승인 무효화 |
| POST /v1/admin/catalogs/{id}/review | {reviewer,evidenceRef,goldenTests,method:'HUMAN_ORIGINAL'} → 검수; 실제 인증 사용자·원문 검수 증거 필요 |
| POST /v1/admin/catalogs/{id}/publish | {expectedReleaseId:string} → release/activation; 동시 게시409 |
| POST /v1/admin/rollback | {releaseId,expectedReleaseId} → activation; 차단 overlay 유지 |
| POST /v1/admin/suspensions | {ruleIds?:string[],sourceIds?:string[],flags?:Partial<Safety.flags>,reason:string} → safety; 독립 journal 먼저 |
| GET /v1/admin/reports | inbox, 본문 복제 없는 조회 audit |
| PATCH /v1/admin/reports/{id} | {status:'OPEN'|'CLASSIFIED'|'CLOSED',category:string} |
| DELETE /v1/admin/reports/{id} | journal 우선 삭제 → 204 |
| GET /v1/admin/audit | 최소 수행자·시각·대상·행위, 본문·토큰 없음 |
| POST /v1/admin/recovery/replay | 독립 journal 멱등 재적용·검증; 정상 bootstrap 복구 |

오류: {code:string,message:string}, 400 INPUT_INVALID/SCHEMA_INVALID, 401 UNAUTHENTICATED, 403 FORBIDDEN/REVIEW_REQUIRED/RIGHTS_REQUIRED, 409 CONFLICT, 413 TOO_LARGE, 429 RATE_LIMITED, 503 SAFETY_UNAVAILABLE/JOURNAL_UNAVAILABLE. 오류 응답에 본문/SQL/비밀을 복제하지 않는다.

개발 인증은 명시적 local 프로필·loopback 요청만 허용. 운영은 OIDC 기존 인증/MFA·subject allowlist·reviewer와publisher 권한, AI 후보 작성 권한을 분리한다. 공개 카탈로그는 0개 기본. fixture/USER_INPUT는 서버 게시 불가. 검수 승인 뒤 파일·원문·권리 변경은 새 초안·재검수.

받은 차단·기능 OFF를 파일 실패와 독립적으로 먼저 저장. 안전 revision은 감소하지 않으며 차단은 overlay에서 누적한다. 다운로드는 같은 허용 host의 /v1/catalog 경로, 최대5MiB. Schema→바이트수/해시→참조→호환→기간 확인 뒤 교체. 안전 실패는 receivedAt 연장 금지. 시간회귀·재부팅 시간근거 불확실에는 재조회까지 보류.
