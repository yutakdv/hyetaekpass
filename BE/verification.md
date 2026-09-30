# 실행 증거 — 2026-09-30

검증 환경: macOS, Java 25, Spring Boot 4.1.1, Gradle 9.5.1, Docker Engine 29.5.3, PostgreSQL 17.11. 아래 자동 시험의 reviewer는 테스트 identity이며 실제 사람 검수 수행을 주장하지 않는다. 외부 자료가 있는 fixture 초안은 게시하지 않았다. 게시/rollback 시험은 빈 카탈로그만 사용한다.

| 시험 | 관측 결과 |
|---|---|
| API TDD 최초 상태 | 인증 보호 전 관리 요청 예상401/403 대신404 등 총6 assertion failures 및1 error 관측 |
| 실제 Spring + PostgreSQL API | source-built 새 Docker 이미지로 확장9 HTTP tests PASS (Ran9 / OK) |
| 실제 fresh DB migration | PostgreSQL 빈 public schema에 Flyway V1 operations 적용 완료 로그 확인 |
| 실제 pg_dump/pg_restore | 삭제된 제보가 DB 복원으로 되살아난 상태에서 bootstrap/inbox503, replay 후 삭제/차단 유지 및 revision 단조성 PASS |
| journal 기록 실패 주입 | API UID10001에서 journal 디렉터리0555: 삭제/차단503, DB변경 없음, 권한복구/replay PASS |
| DB 삭제 실패 주입 | BEFORE DELETE 거절 trigger: journal 먼저 내구기록, DB실패503, trigger제거/replay 후삭제 PASS |
| 운영 bearer 삭제 TDD | production profile 실제 HTTP POST201 뒤 DELETE expected204/actual401 RED 확인; admin 경로 JWT resolver 제한 뒤204/동일토큰 admin401 GREEN |
| health/복구 gate TDD | recovery 대기 health expected200/actual503 RED; DB/journal health 분리 뒤 health200/bootstrap503 GREEN |
| S3 증거 TDD | private S3 proof expected읽기/actual403 RED; SDK GetObject 구현 뒤 private/version/64KiB 제약 GREEN |
| Java 전체 tests | Journal2 + OperatorAccess2 + Evidence1 + ProductionHttp5 =10 tests PASS, 실제Java25·checksum고정 wrapper로 test BUILD SUCCESSFUL |
| 서명 JWT HTTP 경계 | 임시 RSA JWT로 실제production HTTP: valid200, noMFA/비허용subject403, 잘못된audience/issuer/만료/다른키서명401 PASS |
| CORS HTTP TDD | allowed origin OPTIONS200이지만 allow-origin 누락 RED; CORS source bean 연결 뒤 exact5174/8081 OPTIONS·GET allow-origin/Vary 및 외부origin403 GREEN |
| 실제 scheduled retention | 실제 임시 PostgreSQL에 생성90d+1m / 종결30d+1m 합성제보를 넣고100ms test schedule 기다림: 두행삭제·retention actor journal기록·DB적용검증 PASS; 생성89d23h59m 경계전행유지 PASS |
| source-only Docker build | BE/build를 Docker context에서 제외하고 Java25 JDK+wrapper 다운로드부터 build/test/bootJar 및25 JRE/CA runtime image 생성 PASS |
| Gradle wrapper SHA | 공식 wrapper SHA256 `497c8c2a7e5031f6aa847f88104aa80a93532ec32ee17bdb8d1d2f67a194a9c7`와 실제파일 일치; zip SHA 고정 |
| 선택적 AI 도구 컨테이너 | python3.14 profile tools --help PASS, network none, readonly AI/contracts, DB비밀 없음 |

실행 명령은 [README.md](README.md)에 있다. JUnit 결과는 `BE/build/test-results/test/*.xml`, HTML은 `BE/build/reports/tests/test/index.html`에 생성한다. 비밀·삭제 토큰·DB dump는 evidence 파일에 저장하지 않는다.

ProductionHttpTest는 실제 임시 PostgreSQL DB를 생성/마이그레이션/삭제하고 production Spring security를 HTTP로 시험한다. 임시 RSA 공개키 JwtDecoder 및 파일 journal transport만 시험용으로 주입한다. 실제 외부 IdP, 운영 MFA 계정 또는 AWS를 시험한 결과가 아니다. S3 시험은 로컬 HttpServer에 실제 AWS SDK를 사용한 프로토콜 시험이며 실제 AWS bucket/IAM 네트워크 시험은 아직 수행하지 않았다.

미완료 외부 조건: 자료 이용 계약과 기간, 실제 독립 사람 원문 검수/golden 증거, 실제 운영 OIDC/MFA, 실제 AWS S3/RDS/ECS 복원·장애, 실제 위치 SDK·기기·동의 정책, 공개 출시 승인. 이 백엔드가 이러한 외부 조건을 완료한 것으로 표시하지 않는다.
