# AWS 배포 준비

2026-09-30 기준 **정의 검증만 완료**했다. 계정 접속, 리소스 생성, 비용 발생, 운영 OIDC/MFA 연결, 외부 배포는 수행하지 않았다. 이 절차의 실행에는 계정 소유자의 비용·배포 승인이 필요하다.

`stack.json`은 서울 리전의 ARM Fargate 0.5 vCPU/2 GiB 1개, HTTPS ALB+WAF, private Single-AZ PostgreSQL, 비공개 versioned journal/evidence/catalog S3, CloudFront OAC, IAM 역할, 30일 로그를 정의한다. RDS·journal·evidence·catalog는 삭제 시 보존한다. DB에는 API SG만 접속하고 API에는 ALB SG만 접속한다. NAT 대신 public subnet의 task IP를 쓰며, task inbound를 ALB로 제한한다. 이는 고가용성 구성이 아니며, DB 복구 중 서비스 중단을 허용하는 검증판 준비안이다.

## 확인한 정의

실행: `cfn-lint infra/aws/stack.json`, 종료 0. 실제 ALB/TLS/RDS/S3/IAM 동작 검증은 미수행이다. image는 ARM64이며 digest로 고정해야 한다. 백엔드는 ECS task role 자격증명만 사용하며 앱이나 환경변수에 AWS access key를 넣지 않는다.

DB URL은 `sslmode=verify-full&sslrootcert=/app/rds-ca.crt`다. [RDS 공식 CA 안내](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html)의 공개 global bundle을 `rds-ca.crt`로 저장했다. 수신일 2026-09-30, SHA256 `fe45bbebf92ad3e27a583bbb2ddd1553c521ed4d49af5514dc0a40372ea5395c`. 개인 키가 아니다. 배포 전 CA 변경·해시·지원 엔진 버전을 재확인하고 Docker image 안의 파일 존재와 실제 TLS hostname 검사를 시험한다.

WAF는 rate rule과 CommonRuleSet을 사용한다. [기본 SizeRestrictions_BODY](https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-baseline.html)는 8KB 초과 입력과 충돌하여 해당 규칙만 Count로 정의했다. 인증된 import의 5MiB 한도·Schema·참조·권리 검사는 API가 수행한다. ALB의 [본문 검사 범위](https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-setting-body-inspection-limit.html)는 전체 5MiB 검증을 대신하지 않는다. 실제 정상 자료와 악성 입력을 배포 전 재시험한다. WAF sampled request 및 ALB access log는 본문·삭제 토큰·IP 복제를 줄이기 위해 켜지 않았다.

## 실행 전 입력

- AWS 계정/서울 리전 배포 role, ECR digest, 승인된 월 비용 한도·경보 수신자·기간.
- API 도메인 DNS와 그 도메인의 ACM certificate ARN. ALB 출력 hostname을 그대로 서비스 인증서 도메인으로 사용할 수 없다.
- 기존 OIDC issuer/audience, MFA 정책, 작성·검수·게시 담당자의 실제 subject allowlist, 정확한 관리자 HTTPS origin.
- 증거 bucket의 `evidence/<ref>.json`: 소스별 실제 이용권 범위/기간/버전과 실제 작성자 외 사람의 원문 검수·golden 결과. AI·시험용 증거는 운영 승인 근거가 아니다.
- 운영 담당과 대리, 사고 연락·지원/개인정보 연락처, 복구 책임자. 공개 계산 규칙은 승인 증거 확보 전 0개를 유지한다.

GitHub/ECS에 long-lived access key를 저장하지 않는다. CI를 사용할 때는 저장소와 승인 환경으로 제한한 OIDC 역할을 설정하고 trust policy의 repository/branch/environment를 확인한다. 이 저장소에는 자동 유료 배포 workflow를 만들지 않았다.

## 배포 절차 — 미실행

1. 승인된 환경에서 소스 Docker image를 빌드·시험한다. ARM64 image를 ECR로 전송하고 digest를 기록한다. CA와 JVM/SDK 버전을 점검한다.
2. AWS 공식 가격표와 계정별 견적을 재확인한다. Budget의 실제/예측 50%·80%·100% 경보, 일별 비용 이상 감지, RDS CPU credit/스토리지 경보를 설정하고 수신 시험한다. 경보가 지출의 강제 상한은 아니다.
3. `aws cloudformation validate-template --template-body file://infra/aws/stack.json` 후 변경 세트를 만들고 비용·네트워크·IAM·Retain 리소스를 검토한다. 계정 소유자가 승인한 변경 세트만 실행한다. 별도 DNS 레코드를 API 도메인에 연결한다.
4. `/healthz`에서 DB/journal 준비 상태를, `/v1/bootstrap`에서 복구 검증 상태를 구별한다. 초기/복원 환경에서 관리 인증 후 journal replay를 실행하고 bootstrap의 정상 응답·빈 카탈로그·모든 위치 OFF를 확인한다.
5. 실제 OIDC 서명/issuer/audience/시간/MFA/allowlist 검사를 통과시키고 local header·AI 게시·작성자 자기 검수·임의 origin을 거절함을 확인한다. 운영 제보 삭제 토큰은 관리 JWT와 분리한다.
6. 실제 소스 권리·사람 검수 완료 자료만 import→review→publish한다. 기본 카탈로그 제공 경로는 API `/v1/catalog/{releaseId}`다. Catalog S3/CloudFront는 배포 준비 자원이며 자동 업로드·CDN bootstrap 전환은 구현하지 않았다. CDN을 활성 배포 경로로 사용하려면 별도 검증을 먼저 수행한다.
7. HTTPS 단말 통신, rate limit, 금액 회귀, 새 OFF/차단 후 파일 실패, 제보 삭제/복구 훈련을 수행한다. 로그에 제보 본문·삭제 토큰·지갑·좌표가 없는지 검사한다.

## 월 비용 가정

[공식 서울 리전 Price List](cost-snapshot.json)를 2026-09-30 조회했다. 730시간, 무료 혜택·크레딧·약정·세금 미적용이며 사용량 가정이다.

| 항목 | 단가와 가정 | 월 USD |
|---|---|---:|
| Fargate ARM | vCPU 0.03725/h ×0.5 + GiB 0.00409/h ×2 | 19.57 |
| PostgreSQL db.t4g.small | Single-AZ 0.051/h | 37.23 |
| RDS gp3 | 20GB ×0.131/GB-month | 2.62 |
| ALB | 0.0225/h + 1 LCU ×0.008/h | 22.27 |
| public IPv4 | 최소 3개 ×0.005/h | 10.95 |
| WAF | ACL 5 + rule 2개 ×1 + 100만 요청 0.60 | 7.60 |
| 위 가정 소계 | 반올림 전 합산 | **100.23** |

S3의 데이터·요청·version 보존, CloudWatch, CloudFront 전송, ECR, Secrets Manager, DB surplus CPU credit, 초과 snapshot, DNS·domain, 인터넷/AZ 전송, 세금·환율, OIDC, 스토어·기기·검수·법률·인건비는 제외됐다. LCU/IP 수와 실제 트래픽에 따라 증가한다. 문서의 월 120~200 USD 계획안은 확정 견적이나 결제 승인이 아니다. [Fargate](https://aws.amazon.com/fargate/pricing/), [PostgreSQL](https://aws.amazon.com/rds/postgresql/pricing/), [ALB](https://aws.amazon.com/elasticloadbalancing/pricing/), [IPv4](https://aws.amazon.com/vpc/pricing/)를 실제 실행일에 다시 확인한다.

## 복구·사고·철수

정상 DB backup과 독립 journal은 분리해 보관한다. journal에는 차단/OFF/삭제 식별·최소 수행자만 넣으며 제보 본문·삭제 토큰을 넣지 않는다. 서비스 role에는 journal 삭제 권한이 없다. S3 versioning만으로 삭제 방지나 법정 보존 완료를 주장하지 않는다. 저장권한·보존기간·break-glass 역할을 실제 사업 주체와 결정한다.

복원 시 task의 공개 bootstrap을 보류하고 최신 독립 journal을 replay한다. DB 백업에 돌아온 제보가 삭제되고 차단/OFF 및 revision이 유지됐음을 확인한 뒤 서비스를 재개한다. 이전 image/catalog로 돌아가도 journal overlay를 제거하지 않는다. 코드/Schema migration 호환과 백업 RPO/RTO는 실제 복구 훈련에서 측정한다. 로컬 `BE/tests/recovery_harness.py` 성공은 AWS 훈련 성공이 아니다.

사고 시 담당자가 OS/장소 flag와 관련 소스를 즉시 OFF/차단한다. 대리는 별도 MFA 계정과 제한된 subject 역할을 사용한다. 연락·처리·복구 기록은 최소 항목으로 남긴다. 비용 초과 시 신규 소스·pilot를 동결하고 image/DB backup·journal 보존 후 task count 0을 검토한다. task를 중지해도 ALB·RDS·IP·S3 비용은 계속될 수 있다. 철수는 Retain 자원과 법정 의무를 검토한 뒤 계정 소유자가 승인하며, 삭제를 자동 수행하지 않는다.
