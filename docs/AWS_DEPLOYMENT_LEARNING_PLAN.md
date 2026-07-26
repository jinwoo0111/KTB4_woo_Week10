# Community 프로젝트 AWS·DevOps 학습 배포 계획서

## 1. 문서의 목적

이 계획은 아래 두 과제를 순서대로 완성하면서, 단순히 명령어를 복사하는 것이 아니라 각 구성 요소의 역할과 장애 원인을 스스로 설명할 수 있게 되는 것을 목표로 한다.

1. React와 Spring을 EC2 한 대에 직접 설치하고 Nginx 리버스 프록시로 배포한다.
2. React와 Spring에 각각 멀티스테이지 Dockerfile을 작성하고 Docker Compose와 Nginx 리버스 프록시로 통합한다.

대상 저장소는 다음과 같다.

- Frontend: `community-react`
- Backend: `community`

진행 순서는 다음과 같다.

```text
코드 운영 준비
  → 로컬 통합 검증
  → AWS 계정·비용 안전장치
  → EC2 직접 배포
  → Docker 기초 학습
  → 로컬 Docker Compose 검증
  → EC2 Docker Compose 배포
  → 운영 확장 학습
```

## 2. 진행 원칙

### 2.1 학습 원칙

각 작업은 아래 순서로 진행한다.

1. 작업에 필요한 개념을 먼저 설명한다.
2. 변경 결과를 미리 예측한다.
3. 학습자가 직접 콘솔 조작이나 코드 수정을 수행한다.
4. 명령 출력, 로그, 네트워크 요청으로 결과를 검증한다.
5. 의도적으로 한 가지 오류를 만들어 장애 원인을 찾아본다.
6. 정상 상태로 복원하고 Git commit을 남긴다.

한 번에 전체 명령을 실행하지 않고, 검증 가능한 작은 단위로 나눈다.

### 2.2 보안 원칙

- AWS 루트 계정은 계정 전용 작업 외에는 사용하지 않는다.
- 루트 계정과 AWS 작업용 계정에 MFA를 적용한다.
- AWS access key, JWT secret, 비밀번호를 Git에 저장하지 않는다.
- Spring의 8080 포트와 DB 포트를 인터넷에 공개하지 않는다.
- H2 Console은 운영 환경에서 비활성화한다.
- 공개 서비스에서는 HTTPS 적용 전 실제 비밀번호나 개인정보를 사용하지 않는다.
- EC2 접근은 처음에 자신의 IP로 제한한 SSH를 사용하고, Session Manager 확인 후 SSH 포트를 닫는 것을 목표로 한다.
- IAM 권한은 사람에게 주는 권한과 EC2에 주는 권한을 분리한다.

### 2.3 비용 원칙

- 서울 리전 `ap-northeast-2` 한 곳만 사용한다.
- 과제 동안 EC2 한 대와 최소 EBS만 사용한다.
- NAT Gateway, Load Balancer, RDS, EFS, CloudFront는 핵심 과제가 끝나기 전 생성하지 않는다.
- 리소스에는 `Project=community`, `Environment=learning` 태그를 붙인다.
- 실습 종료 시 EC2, EBS, Snapshot, Elastic IP, NAT Gateway, Load Balancer, RDS 목록을 확인한다.
- EC2를 중지해도 EBS와 일부 네트워크 자원 비용은 남을 수 있음을 전제로 한다.
- AWS Budget은 결제를 차단하는 장치가 아니라 지연될 수 있는 알림이라는 전제로 운영한다.

## 3. 현재 코드 기준선

### 3.1 확인된 정상 상태

- 두 저장소 모두 `main`과 `origin/main`이 연결되어 있다.
- 두 저장소의 작업 트리는 현재 깨끗하다.
- React의 `npm run lint`가 성공한다.
- React의 `npm run build`가 성공한다.
- Spring의 `./gradlew test`가 성공한다.
- React의 로컬 `.env`는 Git에서 제외되어 있다.
- Spring의 H2 데이터와 업로드 디렉터리는 Git에서 제외되어 있다.

### 3.2 배포 전에 해결할 항목

| 우선순위 | 저장소 | 항목 | 위험 또는 불편 |
|---|---|---|---|
| P0 | Spring | JWT secret이 추적되는 설정 파일에 존재 | 공개된 키로 토큰 위조 가능 |
| P0 | Spring | H2 Console이 활성화되고 접근 허용됨 | 운영 DB 노출 위험 |
| P0 | Spring | 운영 환경과 로컬 환경의 설정 분리가 부족 | 실수로 개발 설정을 운영에 적용 가능 |
| P1 | React | API base URL이 절대 HTTP URL만 허용 | IP·도메인 변경 때마다 재빌드 필요 |
| P1 | React/Spring | 로컬 CORS 기반으로 연결 | Nginx 동일 출처 구조와 설정이 다름 |
| P1 | Spring | DB와 업로드 경로가 실행 위치에 의존 | systemd·Docker에서 데이터 위치 혼동 |
| P1 | Spring | 서버 바인딩 범위가 명시되지 않음 | 8080 포트가 불필요하게 외부 인터페이스에 열릴 수 있음 |
| P1 | 배포 | React Router용 Nginx fallback 없음 | 하위 URL 새로고침 시 404 |
| P1 | 배포 | 업로드 크기에 대응하는 Nginx 설정 없음 | 10MB 이미지가 프록시에서 거절될 수 있음 |
| P2 | 운영 | 명시적인 health endpoint가 없음 | systemd·Docker 상태 판별이 어려움 |
| P2 | 운영 | 백업·복원 절차가 없음 | EC2 또는 volume 삭제 시 데이터 유실 |

이미 Git에 포함된 JWT 키는 설정 파일에서 삭제하는 것만으로 안전해지지 않는다. 운영 배포에는 반드시 새로 생성한 별도 키를 사용한다.

## 4. Phase A — 코드 운영 준비

AWS 리소스를 생성하기 전에 완료한다. 이 단계에서는 비용이 발생하지 않는다.

### A-0. 작업 기준선과 Git 전략 확정

학습 목표:

- 로컬 작업, GitHub, 배포 서버의 관계를 이해한다.
- 변경을 작은 단위로 되돌릴 수 있게 만든다.

작업:

- 두 저장소에서 현재 `main` 상태와 테스트 결과를 기록한다.
- 두 저장소에 동일한 목적의 작업 브랜치를 만든다.
- 각 단계가 끝날 때 저장소별로 작은 commit을 남긴다.
- 비밀값이 Git history에 들어가지 않도록 commit 전 확인 절차를 만든다.

권장 commit 구분:

1. Spring 운영 설정 분리
2. React 동일 출처 API 지원
3. 로컬 통합 검증
4. 직접 배포용 Nginx·systemd 파일
5. Dockerfile
6. Compose와 Docker용 Nginx 설정
7. 운영 문서

완료 조건:

- 두 저장소가 원격 브랜치를 추적한다.
- 기존 테스트가 동일하게 통과한다.
- `.env`, 실제 JWT secret, 키 파일이 추적되지 않는다.

### A-1. Spring 설정을 환경별로 분리

학습 목표:

- 소스 코드, 설정, 비밀정보의 차이를 이해한다.
- Spring profile과 환경변수의 우선순위를 이해한다.

예정 작업:

- 공통 설정과 `local`, `prod` 설정을 분리한다.
- `jwt.secret`을 환경변수 `JWT_SECRET`으로 받는다.
- 운영 환경에서 H2 Console을 비활성화한다.
- 운영 환경에서 SQL 전체 출력과 불필요한 상세 로그를 끈다.
- 데이터베이스 파일 경로를 환경변수로 지정 가능하게 만든다.
- 업로드 루트 경로를 환경변수로 지정 가능하게 만든다.
- 운영 환경에서 Spring을 `127.0.0.1:8080`에 바인딩한다.
- CORS 허용 origin을 환경별 설정으로 옮긴다.
- 필요하면 health endpoint만 제한적으로 추가한다.
- Spring용 환경변수 예시 파일을 만들고 실제 값은 제외한다.

예정 환경변수:

```text
SPRING_PROFILES_ACTIVE
JWT_SECRET
SERVER_ADDRESS
SERVER_PORT
DB_PATH
UPLOAD_PATH
ALLOWED_ORIGINS
```

검증:

- 환경변수가 없으면 운영 실행이 명확한 오류로 실패하는지 확인한다.
- 새 JWT secret으로 로그인과 인증 요청이 성공하는지 확인한다.
- 잘못된 secret으로 만든 토큰이 거절되는지 확인한다.
- `prod` profile에서 `/h2-console`이 열리지 않는지 확인한다.
- `./gradlew test`와 `./gradlew bootJar`가 성공하는지 확인한다.
- 애플리케이션 로그에 JWT secret이 출력되지 않는지 확인한다.

완료 조건:

- 운영에 사용할 비밀값이 저장소에 없다.
- local과 prod의 차이를 문서로 설명할 수 있다.
- 데이터와 업로드 경로가 실행 디렉터리에 우연히 의존하지 않는다.

### A-2. React를 동일 출처 `/api` 구조로 변경

학습 목표:

- origin, CORS, reverse proxy의 관계를 이해한다.
- Vite의 개발 서버 proxy와 운영 Nginx proxy 차이를 이해한다.

예정 작업:

- `VITE_API_BASE_URL=/api` 같은 상대 경로를 지원한다.
- 개발 환경에서 Vite가 `/api` 요청을 Spring `localhost:8080`으로 전달하게 한다.
- 프록시가 Spring으로 전달할 때 `/api` prefix를 제거한다.
- 이미지 URL도 `/api/uploads/**` 구조에서 정상 동작하게 한다.
- `.env.example`을 새로운 방식에 맞춘다.

목표 요청 흐름:

```text
브라우저 /api/posts
  → 개발: Vite proxy → Spring /posts
  → 운영: Nginx proxy → Spring /posts
```

검증:

- 브라우저 개발자 도구에서 API 요청이 `/api/**`로 보인다.
- 브라우저와 API의 origin이 같아 별도 CORS 요청이 필요하지 않음을 확인한다.
- 로그인 응답의 `Authorization` 헤더가 React까지 전달된다.
- 업로드와 업로드 이미지 표시가 정상이다.
- `npm run lint`와 `npm run build`가 성공한다.

완료 조건:

- EC2의 IP 또는 도메인이 변경되어도 React를 다시 빌드할 필요가 없다.
- 개발과 운영이 같은 `/api` URL 규칙을 사용한다.

### A-3. 로컬 통합 검증

학습 목표:

- 프론트 문제, 백엔드 문제, 프록시 문제를 분리해 진단한다.

검증 시나리오:

1. 비로그인 게시글 목록 조회
2. 회원가입
3. 로그인과 JWT 저장
4. 인증된 게시글 생성·수정·삭제
5. 댓글과 좋아요
6. 프로필 및 게시글 이미지 업로드
7. 만료되거나 잘못된 JWT 처리
8. Spring 중지 시 React의 오류 화면
9. 허용 크기 초과 이미지 처리

각 시나리오는 다음 세 위치에서 확인한다.

- 브라우저 Network 탭
- Spring 로그
- 파일시스템의 H2·uploads 결과

완료 조건:

- 핵심 사용자 흐름이 모두 정상이다.
- 실패 응답의 HTTP status와 애플리케이션 message를 구분할 수 있다.
- 서버 장애와 인증 장애를 구분할 수 있다.

### A-4. 직접 배포용 운영 파일 준비

학습 목표:

- Linux service와 reverse proxy가 애플리케이션을 어떻게 운영하는지 이해한다.

예정 산출물:

- Nginx server 설정 예시
- Spring systemd unit 예시
- 운영 환경변수 예시
- 디렉터리·파일 권한 표
- 배포 및 rollback 체크리스트

Nginx가 담당할 기능:

- React 정적 파일 제공
- React Router를 위한 `try_files ... /index.html`
- `/api/`를 `127.0.0.1:8080`으로 proxy
- Spring 전달 시 `/api` prefix 제거
- 요청·응답 헤더 전달
- 업로드 크기 제한 조정
- 보안 헤더
- 이후 HTTPS와 HTTP→HTTPS redirect

systemd가 담당할 기능:

- Spring 프로세스 시작과 종료
- 서버 부팅 후 자동 시작
- 비정상 종료 시 제한적인 재시작
- 전용 사용자로 실행
- 환경변수 파일 연결
- 고정된 working directory 사용
- `journalctl` 로그 연결

완료 조건:

- Nginx와 systemd 설정을 문법 검사할 방법이 문서화되어 있다.
- 애플리케이션 파일, 설정, 비밀정보, 영속 데이터의 위치가 분리되어 있다.
- rollback 대상 JAR 또는 Git commit을 명확히 지정할 수 있다.

### A-5. Phase A 종료 검토

실행할 최종 검사:

```text
React lint
React production build
Spring tests
Spring bootJar
Git status
추적 파일 대상 비밀정보 검사
운영 설정 검토
```

Phase A 완료 조건:

- AWS에 올리기 전 로컬 품질 검증이 모두 통과한다.
- 실제 운영 secret이 Git에 없다.
- React와 Spring이 `/api` 동일 출처 규칙을 사용한다.
- 운영 배포 파일을 한 줄씩 설명할 수 있다.

## 5. Phase B — AWS 계정·비용 안전장치

Phase A가 완료된 후, EC2를 만들기 전에 진행한다.

### B-1. 계정 보호

- 루트 계정 MFA를 확인한다.
- 루트 access key가 없는지 확인한다.
- 일상 작업용 IAM Identity Center 또는 IAM 사용자를 분리한다.
- 일상 작업 계정에도 MFA를 적용한다.
- 브라우저에 로그인한 계정 ID와 IAM principal을 확인하는 습관을 만든다.

학습 개념:

- 인증과 권한 부여
- root user, IAM user, role의 차이
- 장기 자격 증명과 임시 자격 증명
- MFA와 최소 권한

### B-2. 비용 방어선

- Billing의 Free Tier 또는 credit 상태를 확인한다.
- 결제 알림 이메일을 확인한다.
- 낮은 금액의 actual·forecast Budget 알림을 설정한다.
- Cost Anomaly Detection 알림을 설정한다.
- 과제용 리소스 태그 규칙을 정한다.
- 매 실습 종료 시 확인할 비용 리소스 목록을 저장한다.

권장 초기 알림:

- 실제 비용 1 USD
- 예상 비용 5 USD
- 실제 비용 10 USD

완료 조건:

- 계정의 무료 사용 또는 credit 적용 상태를 직접 확인했다.
- 알림 수신 주소가 인증되었다.
- Budget이 비용을 강제로 차단하지 않는다는 점을 설명할 수 있다.

### B-3. EC2 네트워크 설계

이번 과제의 최소 구성:

```text
VPC
└─ Public Subnet 1개
   ├─ Internet Gateway로 가는 route
   └─ EC2 1대
      ├─ Nginx: 80/443
      └─ Spring: 127.0.0.1:8080
```

사용:

- VPC
- Public Subnet
- Route Table
- Internet Gateway
- Security Group
- EC2
- EBS
- IAM Role
- Public IPv4

사용하지 않음:

- NAT Gateway
- ALB
- RDS
- EFS
- CloudFront
- API Gateway

Security Group 원칙:

- 22: 임시로 현재 자신의 공인 IP만 허용
- 80: 초기 검증 중에는 자신의 IP, 공개 검증 시 필요한 범위
- 443: HTTPS 설정 후 공개
- 8080: inbound 규칙 없음
- DB 포트: inbound 규칙 없음

완료 조건:

- Security Group과 Linux의 listening port 차이를 설명할 수 있다.
- Public Subnet이 public인 이유를 route로 설명할 수 있다.
- NAT Gateway가 이번 구조에 필요 없는 이유를 설명할 수 있다.

## 6. Phase C — EC2 한 대에 직접 배포

### C-1. EC2 생성

권장 초기 구성:

- 서울 리전
- Ubuntu Server 24.04 LTS
- 콘솔에서 무료 사용 가능 여부를 확인한 작은 인스턴스
- 12~16GB gp3 암호화 EBS
- IMDSv2 필수
- 상세 모니터링 비활성화
- 과제 태그 지정
- Session Manager용 IAM role

1GB 메모리 인스턴스에서 빌드가 부족하면:

1. React와 Spring을 동시에 빌드하지 않는다.
2. Gradle daemon을 사용하지 않는다.
3. 제한된 swap을 임시 사용한다.
4. 그래도 실패하면 빌드 시간 동안만 작은 상위 타입으로 변경한다.

### C-2. 안전한 접속

- 처음에는 key pair와 자신의 IP로 제한한 SSH를 준비한다.
- Session Manager 접속을 확인한다.
- Session Manager가 안정적으로 동작하면 22번 inbound 제거를 검토한다.
- EC2에 AWS access key를 저장하지 않는다.

### C-3. GitHub 기반 배포

공개 저장소:

- EC2에서 HTTPS로 `git clone`
- 이후 `git pull --ff-only`

비공개 저장소:

- 저장소별 read-only Deploy Key 사용
- 개인 access token을 URL, shell history, 설정 파일에 넣지 않음

배포 흐름:

```text
로컬 수정·검증
  → Git commit
  → GitHub push
  → EC2 git pull
  → build
  → 배포
  → service restart
  → health·기능 검증
```

### C-4. 직접 설치

설치 대상:

- Git
- Java 21
- Node.js LTS
- Nginx

배포 대상:

- React production build 결과
- Spring executable JAR
- systemd unit
- Nginx 설정
- 서버 전용 환경변수 파일
- H2 data와 uploads 디렉터리

권한 원칙:

- Spring은 전용 비로그인 사용자로 실행한다.
- 애플리케이션 사용자는 data와 uploads에만 쓸 수 있다.
- 환경변수 파일은 최소 권한으로 제한한다.
- Nginx는 Spring JAR나 secret을 읽을 필요가 없다.

### C-5. 계층별 검증

아래 순서로 확인한다.

1. Spring process와 `127.0.0.1:8080`
2. 로컬 Spring health 또는 게시글 API
3. Nginx 설정 문법
4. EC2 내부에서 Nginx `/api`
5. 외부 브라우저의 React
6. React 하위 route 새로고침
7. 로그인 응답 header
8. 이미지 업로드
9. EC2 재부팅 후 자동 복구

장애 실습:

- Spring을 중지하고 Nginx의 502 및 로그를 확인한다.
- 잘못된 Nginx upstream을 설정해 오류 위치를 찾는다.
- 파일 권한을 잘못 설정했을 때 systemd 로그를 읽는다.
- 잘못된 JWT secret으로 실행 실패를 확인한다.

### C-6. HTTPS

초기 HTTP 검증에서는 실제 개인정보와 재사용하는 비밀번호를 사용하지 않는다.

공개 배포 전:

- 고정 주소 전략 결정
- 도메인과 DNS 연결
- TLS 인증서 발급
- Nginx HTTPS 적용
- 80에서 443으로 redirect
- 인증서 자동 갱신 검증

이 단계에서 Route 53, Elastic IP, DNS TTL, TLS handshake를 학습한다.

### C-7. 직접 배포 완료 조건

- 외부에서는 Nginx만 접근할 수 있다.
- Spring 8080과 H2 Console은 외부에서 접근할 수 없다.
- 로그인, CRUD, 댓글, 좋아요, 업로드가 정상이다.
- React 하위 route 새로고침이 정상이다.
- 재부팅 후 서비스가 복구된다.
- 로그 위치와 확인 명령을 설명할 수 있다.
- EC2 중지와 종료가 데이터·IP·비용에 미치는 영향을 설명할 수 있다.
- 배포 및 rollback 과정을 문서만 보고 다시 수행할 수 있다.

## 7. Phase D — Docker 기초와 로컬 Compose

### D-1. 핵심 개념

- Dockerfile: 이미지를 만드는 선언적 조리법
- Image: 코드와 런타임을 포함한 읽기 전용 실행 템플릿
- Container: 이미지에서 만들어진 격리된 프로세스
- Layer: 이미지 빌드 결과를 재사용하는 단위
- Registry: 이미지를 저장하고 배포하는 원격 저장소
- Volume: 컨테이너 생명주기와 분리된 영속 데이터
- Network: 컨테이너가 service name으로 통신하는 네트워크
- Compose: 여러 컨테이너의 관계를 선언하는 구성
- 멀티스테이지 빌드: 빌드 환경과 실행 환경을 분리하는 방법

### D-2. Spring 멀티스테이지 Dockerfile

빌드 스테이지:

- JDK 21
- Gradle Wrapper
- 의존성 cache를 고려한 COPY 순서
- test 또는 bootJar 실행

실행 스테이지:

- JRE 21
- non-root 사용자
- JAR만 복사
- 8080 내부 포트
- 환경변수로 secret과 경로 주입
- healthcheck 지원
- data와 uploads volume 경로

검증:

- 최종 이미지에 Gradle, 소스, secret이 없는지 확인한다.
- 일반 사용자로 프로세스가 실행되는지 확인한다.
- 컨테이너 삭제 후 volume 데이터가 유지되는지 확인한다.

### D-3. React 멀티스테이지 Dockerfile

빌드 스테이지:

- Node.js LTS
- `npm ci`
- Vite production build

실행 스테이지:

- 경량 Nginx
- `dist`만 복사
- SPA fallback
- `/api`를 backend service로 proxy
- 업로드 크기와 proxy header 설정

검증:

- 최종 이미지에 `node_modules` 전체와 Node 빌드 도구가 없는지 확인한다.
- 직접 URL 새로고침이 정상인지 확인한다.
- backend를 host IP가 아닌 Compose service name으로 찾는지 확인한다.

### D-4. Docker Compose

권장 service:

```text
frontend
  - 외부 포트 공개
  - React 정적 파일
  - Nginx reverse proxy

backend
  - 외부 포트 공개하지 않음
  - Compose 내부 네트워크에서만 접근

volumes
  - H2 data
  - uploads
```

보안·운영 항목:

- 실제 `.env`는 Git 제외
- secret을 build argument로 전달하지 않음
- backend host port를 publish하지 않음
- restart policy 설정
- healthcheck와 의존 상태 설정
- 이미지 tag와 base image 버전 명시
- `.dockerignore` 적용
- container log 확인 절차 작성

### D-5. 로컬 Compose 검증

검증:

1. 새 이미지 build
2. 서비스 기동
3. frontend → backend DNS 확인
4. 전체 기능 테스트
5. backend 재시작 후 복구
6. container 삭제 후 데이터 유지
7. volume을 포함한 백업·복원
8. image history에서 secret 부재 확인
9. 사용하지 않는 image·volume 식별

삭제 명령은 volume 삭제 여부를 구분해 사용한다. 학습 데이터가 필요할 때 `down -v`를 실행하지 않는다.

## 8. Phase E — EC2 Docker Compose 배포

### E-1. 전환 준비

- 직접 설치 버전의 DB와 uploads를 백업한다.
- 직접 설치한 Spring systemd service를 중지한다.
- host Nginx와 Compose frontend의 포트 충돌을 정리한다.
- rollback 시 직접 설치 버전으로 돌아가는 절차를 준비한다.

### E-2. 배포

- EC2에 Docker Engine과 Compose plugin을 설치한다.
- GitHub에서 두 저장소를 같은 부모 디렉터리에 clone한다.
- 서버 전용 `.env`를 생성한다.
- 이미지를 순차 build한다.
- Compose를 기동한다.
- health와 로그를 확인한다.
- 재부팅 후 자동 복구를 확인한다.

메모리 부족 시 선택:

- 임시 swap
- build 순서 분리
- 로컬 또는 CI에서 image build 후 registry에서 pull
- 빌드 시간에만 인스턴스 크기 임시 변경

### E-3. 완료 조건

- 외부에서는 frontend Nginx만 접근 가능하다.
- backend는 Compose 내부 네트워크에서만 접근 가능하다.
- 컨테이너 재생성 후 DB와 업로드가 유지된다.
- secret이 Git, image, Compose 파일에 없다.
- 직접 설치 버전과 Docker 버전의 요청 흐름 차이를 설명할 수 있다.
- 장애 발생 시 container, network, volume, application log를 순서대로 확인할 수 있다.

## 9. Phase F — 과제 이후 AWS 확장 로드맵

핵심 과제 완료 후 다음 순서로 확장한다.

### F-1. S3

- uploads를 EC2 디스크에서 S3 object로 이전
- IAM Role을 통한 접근
- bucket public access 차단
- presigned URL과 object lifecycle 학습

### F-2. RDS

- H2에서 PostgreSQL 또는 MySQL로 이전
- private subnet
- DB Security Group은 애플리케이션 Security Group만 허용
- backup, snapshot, Multi-AZ 차이 학습

### F-3. Route 53과 CloudFront

- DNS record와 TTL
- 정적 파일 또는 S3 origin
- CDN cache와 invalidation
- TLS 인증서와 region 관계

### F-4. ALB와 다중 EC2

- Target Group과 health check
- ALB Security Group과 EC2 Security Group 분리
- 한 대 장애 시 트래픽 분산
- sessionless JWT 구조의 장점
- 로컬 파일 upload가 다중 서버에서 문제가 되는 이유

### F-5. EFS와 API Gateway

- EFS가 필요한 공유 POSIX 파일 use case
- S3와 EFS의 차이
- API Gateway의 인증, throttling, serverless integration
- 현재 Nginx+Spring 구조에서 API Gateway가 반드시 필요하지 않은 이유

### F-6. CI/CD와 Infrastructure as Code

- GitHub Actions에서 test와 image build
- registry에 image push
- EC2는 image pull과 배포만 수행
- OIDC로 장기 AWS access key 제거
- Terraform 또는 CloudFormation으로 VPC·EC2·Security Group 재현
- staging과 production 환경 분리

## 10. 단계별 산출물

| 단계 | 산출물 |
|---|---|
| Phase A | 운영 안전 설정, `/api` 통합, 테스트 결과, Nginx·systemd 예시 |
| Phase B | 계정 보안 체크리스트, Budget, 최소 AWS 구조 |
| Phase C | EC2 직접 배포, 운영·rollback 문서 |
| Phase D | React·Spring 멀티스테이지 Dockerfile, Compose |
| Phase E | EC2 Compose 배포와 데이터 이전·복원 기록 |
| Phase F | AWS 확장 실습 기록과 아키텍처 비교 |

## 11. 매 단계 공통 체크리스트

### 변경 전

- 현재 브랜치와 Git status 확인
- 작업 목적과 예상 결과 설명
- rollback 지점 확인
- 비용이 발생하는 AWS 작업인지 확인

### 변경 후

- 자동 테스트
- 수동 기능 테스트
- listening port 확인
- 로그 확인
- secret과 개인정보 노출 확인
- Git diff 검토
- 작은 commit 생성

### AWS 작업 종료 전

- 실행 중 EC2 확인
- 연결되지 않은 EBS와 Snapshot 확인
- Elastic IP 확인
- NAT Gateway 확인
- Load Balancer와 Target Group 확인
- RDS 확인
- 예상 비용과 Budget 상태 확인
- 유지할 리소스는 이유와 종료 예정일 기록

## 12. 첫 번째 실행 세션

첫 세션에서는 AWS Console을 열지 않는다.

진행 범위:

1. 두 저장소의 작업 브랜치 결정
2. Spring 설정 파일의 현재 우선순위 확인
3. JWT secret 환경변수화
4. local·prod profile 분리
5. H2 Console 운영 비활성화
6. 테스트와 bootJar 검증
7. 변경 내용과 보안 효과 설명
8. Spring 저장소 첫 commit 준비

첫 세션 완료 후 두 번째 세션에서 React의 `/api` 동일 출처 전환을 진행한다.
