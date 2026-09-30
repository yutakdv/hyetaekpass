# 백엔드 검증판

Spring Boot 4.1.1, Java 25, PostgreSQL 17.11을 사용한다. 계산은 공유 TypeScript 엔진이 담당하고 Java는 계산하지 않는다. 빈 카탈로그만 기본 제공하며 원문·권리 증거 없는 실제 혜택 자료는 게시할 수 없다.

## 로컬 실행

저장소 루트에서 Docker와 Java 25를 준비한다. `init-local.py`는 개인 `.env`에 무작위 DB 비밀번호를 생성한다. 비밀번호나 제보 삭제 토큰을 로그·명령 인자에 붙이지 않는다.

```sh
python3 infra/local/init-local.py
docker volume create hyetaekpass-safety-journal
docker compose --env-file infra/local/.env -f infra/local/compose.yml up -d --build db api
docker compose --env-file infra/local/.env -f infra/local/compose.yml run --rm test
python3 BE/tests/recovery_harness.py
```

이미지는 소스부터 Java 25와 검증한 Gradle 9.5.1 wrapper로 빌드한다. 이미지 빌드에서 DB가 필요한 `ProductionHttpTest`만 제외하고 나머지 Java 시험을 실행한다. 전체 Java 시험은 실제 로컬 DB가 실행 중일 때 다음으로 실행한다.

```sh
export JAVA_HOME=$(/usr/libexec/java_home -v 25) # macOS: 설치된 실제 Java 25 home
GRADLE_USER_HOME="$PWD/.local-tools/gradle" BE/gradlew -p BE test bootJar --no-daemon
```

Compose API는 기본 127.0.0.1:8080에 공개한다. Docker 호스트 경유 관리 요청은 컨테이너의 loopback이 아니므로 관리 API가 403을 반환한다. 브라우저 관리 UI를 시험하려면 위 JAR 빌드 후 다음 native 서버를 사용한다. 이 스크립트는 Compose API를 정지하고 별도 `hyetaekpass_native` DB와 `BE/.journal-native`를 사용한다.

```sh
python3 BE/run-local.py
# 신뢰하는 LAN에서 휴대폰 공개 API 디버깅이 필요할 때만
python3 BE/run-local.py --lan
```

관리 접근은 `local` 단독 프로필의 loopback 요청에만 허용된다. 개발용 `X-Local-Subject`는 author, reviewer, publisher 역할을 구분한다. 이 헤더를 사용한 자동 시험은 실제 사람의 원문 검수 증거가 아니다. native `--lan`에서도 원격 관리 API는 차단된다. Compose LAN 공개는 `API_BIND_ADDRESS=0.0.0.0` 환경을 명시해야 한다. DB 포트는 항상 127.0.0.1:54329이다.

## API 예제

```sh
curl -fsS http://127.0.0.1:8080/healthz
curl -fsS http://127.0.0.1:8080/v1/bootstrap
curl -fsS http://127.0.0.1:8080/v1/catalog/empty-v1
curl -fsS -H 'X-Local-Subject: author' http://127.0.0.1:8080/v1/admin/catalogs
curl -fsS -H 'X-Local-Subject: author' -H 'Content-Type: application/json' \
  --data-binary @contracts/empty-catalog.json http://127.0.0.1:8080/v1/admin/import
```

`GET /v1/admin/catalogs`는 `{id,releaseId,status,author,createdAt,catalog,review}` 배열을 반환한다. `PATCH /v1/admin/catalogs/{id}` 본문은 전체 Catalog이며 초안을 수정하면 검수와 digest가 무효화된다. 검수·게시·rollback 등 전체 요청 계약은 [contracts/api.md](../contracts/api.md)를 따른다. 게시/rollback은 `expectedReleaseId`와 현재 활성 포인터가 같아야 성공한다. 게시한 카탈로그 바이트는 변경할 수 없으며 bootstrap의 SHA-256과 sizeBytes는 내려받는 정확한 바이트를 기준으로 한다.

`POST /v1/reports`는 `{category,message,ruleId?}`를 받고 `{id,deleteToken}`을 201로 반환한다. 삭제 토큰은 32 무작위 바이트의 base64url 문자열이며 서버는 SHA-256만 저장한다. `DELETE /v1/reports/{id}`에 `Authorization: Bearer <deleteToken>`을 보내면 204이다. 운영 JWT 필터는 `/v1/admin/**`에서만 작동하여 이 불투명 삭제 토큰을 JWT로 해석하지 않는다. 제보 inbox는 `{id,ruleId,category,message,status,createdAt}` 배열을 반환한다. audit에는 제보 본문/삭제 토큰/IP를 기록하지 않는다.

## 독립 journal과 복구

삭제와 긴급 차단은 journal을 먼저 내구성 있게 기록한 다음 DB에 적용한다. 로컬은 fsync/atomic rename/디렉터리 fsync, 운영은 S3 조건부 쓰기·버전 확인·읽기 검증이다. `hyetaekpass-safety-journal` 외부 Docker volume은 DB volume과 별개이므로 DB 복원 시 함께 과거로 되돌리거나 삭제하지 않는다.

DB 복원 뒤 journal과 DB 적용 기록·삭제 효과·차단 상태가 일치하지 않으면 bootstrap, 카탈로그, inbox가 503을 반환한다. 관리자가 `POST /v1/admin/recovery/replay`로 journal을 다시 적용해야 한다. 재실행은 멱등이며 안전 revision을 낮추지 않는다. `/healthz`는 DB 연결과 journal 서비스의 읽기·무결성을 확인하므로 DB 복구 대기 중에도 정상일 수 있다. 공개 준비 상태는 `/v1/bootstrap`으로 확인한다.

`recovery_harness.py`는 이 프로젝트의 일회성 로컬 `hyetaekpass` DB에 실제 `pg_dump`/`pg_restore --clean`과 장애 주입을 수행한다. 개인 자료나 다른 DB에 실행하지 않는다. journal/head가 끊기거나 손상된 경우 503으로 차단하며 운영자가 버전 이력과 증거를 조사해야 한다. 파일 삭제·head 강제 재설정·삭제 기록 무시로 복구하지 않는다.

## 운영 환경

필수 환경은 `SPRING_PROFILES_ACTIVE=production`, `DB_URL`, `DB_USER`, `DB_PASSWORD`, `OIDC_ISSUER`(HTTPS), `OIDC_AUDIENCE`, `OPERATOR_AUTHORS`, `OPERATOR_REVIEWERS`, `OPERATOR_PUBLISHERS`, `ADMIN_ORIGINS`(정확한 허용 origin), `JOURNAL_MODE=s3`, `JOURNAL_BUCKET`, `AWS_REGION`, `EVIDENCE_BUCKET`이다. DB_PASSWORD는 플랫폼 비밀 주입으로 전달한다. RDS 연결은 `sslmode=verify-full&sslrootcert=/app/rds-ca.crt`를 사용하고 이미지에 공식 CA bundle을 포함한다.

보관기간 삭제는 매시간 실행하며 `RETENTION_INTERVAL_MS`로 시험 간격을 설정할 수 있다. 실제 PostgreSQL 시험에서는 생성90일/종결30일 초과 자료만 삭제하고 경계 전 자료를 유지함을 확인했다.

운영 관리 인증은 서명·issuer·audience·유효기간 검증 JWT, `amr`의 `mfa`, 역할별 정확한 subject allowlist를 모두 요구한다. subject를 allowlist에 추가하는 것이 실제 조직의 승인 절차와 MFA 검증을 대체하지 않는다. 공개 출시 전 실제 IdP/기기에서 검증해야 한다. 위치 관련 기능은 기본 OFF이며 enable=true 요청을 403으로 거절한다.

S3는 ECS task role 자격만 사용하며 환경 access key/profile 파일이나 로컬 journal로 fallback하지 않는다. journal/evidence bucket은 versioning Enabled와 public access block 네 설정 모두 true가 필요하다. IAM은 journal ListBucket/GetObject/PutObject/GetBucketVersioning/GetBucketPublicAccessBlock, evidence GetObject/GetBucketVersioning/GetBucketPublicAccessBlock이 필요하다. API는 evidence를 업로드하지 않는다. 승인된 운영자가 별도 IAM으로 `evidence/<evidenceRef>.json`을 등록한다. 각 proof는 최대 64 KiB의 버전 있는 JSON이며 공개 API로 반환하지 않는다. 로컬 시험만 `JOURNAL_ENDPOINT`/`EVIDENCE_ENDPOINT`의 loopback HTTP 저장소를 허용한다. 파일 증거는 local 기본 `BE/.evidence` 또는 명시한 `EVIDENCE_DIR` readonly mount를 사용할 수 있다.

권리 proof `RIGHTS_GRANT`는 sourceId, documentVersion, 해당 source JSON의 SHA-256 sourceDigest 및 display/transform/iosDistribution/androidDistribution/offlineCache/update/revoke=true를 포함한다. 원문 proof `ORIGINAL_REVIEW`는 독립 reviewer, 정규화된 catalogDigest, goldenPassed=true 및 동일 goldenTests를 포함한다. 서버는 보관된 proof와 현재 자료 digest·만료를 재검사한다. proof JSON 자체의 실제 계약·사람 검수 진실성은 조직의 별도 증거등록 승인에 의존한다. 자동 생성 proof를 실제 증거로 취급하지 않는다.

기술 검증 범위와 남은 외부 검증은 [verification.md](verification.md)에 기록했다. 현재 journal 검사 비용은 요청당 O(events)이며 한 개 활성 writer의 소규모 검증판을 대상으로 한다. 공개 트래픽 확대 전 검증된 head/cursor 캐시와 실제 S3/DB 장애 시험이 필요하다.

버전 근거: [Spring Boot 공식 system requirements](https://docs.spring.io/spring-boot/system-requirements.html), [PostgreSQL versioning](https://www.postgresql.org/support/versioning/), [AWS SDK 2.55.8 공식 release](https://github.com/aws/aws-sdk-java-v2/releases/tag/2.55.8), [Gradle 공식 배포 checksum](https://services.gradle.org/distributions/gradle-9.5.1-bin.zip.sha256).
