"""Run the native loopback-admin server against its own local DB/journal."""
import argparse, os, pathlib, shutil, subprocess

root=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
parser.add_argument('--lan',action='store_true',help='Expose public debug API to the trusted LAN; admin remains loopback only')
parser.add_argument('--port',type=int,default=8080)
args=parser.parse_args()
subprocess.run(['python3',str(root/'infra/local/init-local.py')],check=True)
compose=['docker','compose','-f',str(root/'infra/local/compose.yml'),'--env-file',str(root/'infra/local/.env')]
subprocess.run(compose+['up','-d','db'],check=True)
subprocess.run(compose+['stop','api'],check=True)
existing=subprocess.run(compose+['exec','-T','db','psql','-X','-U','hyetaekpass','-d','hyetaekpass','-At','-c',"SELECT 1 FROM pg_database WHERE datname='hyetaekpass_native'"],capture_output=True,check=True).stdout.strip()
if not existing: subprocess.run(compose+['exec','-T','db','createdb','-U','hyetaekpass','hyetaekpass_native'],check=True)
env=os.environ.copy()
for line in (root/'infra/local/.env').read_text().splitlines():
    if line.startswith('DB_PASSWORD='): env['DB_PASSWORD']=line.split('=',1)[1]
env.update(SPRING_PROFILES_ACTIVE='local',DB_URL='jdbc:postgresql://127.0.0.1:54329/hyetaekpass_native',DB_USER='hyetaekpass',
           JOURNAL_MODE='file',JOURNAL_DIR=str(root/'BE/.journal-native'),API_BIND='0.0.0.0' if args.lan else '127.0.0.1',API_PORT=str(args.port))
java_home=env.get('JAVA_HOME')
if not java_home and pathlib.Path('/usr/libexec/java_home').exists():
    java_home=subprocess.run(['/usr/libexec/java_home','-v','25'],capture_output=True,text=True,check=True).stdout.strip()
executable=str(pathlib.Path(java_home)/'bin/java') if java_home else shutil.which('java')
version=subprocess.run([executable,'-XshowSettings:properties','-version'],capture_output=True,text=True,check=True)
if 'java.specification.version = 25' not in version.stderr: raise SystemExit('Set JAVA_HOME to a Java 25 JDK home')
jar=root/'BE/build/libs/hyetaekpass-api-0.1.0.jar'
if not jar.exists(): raise SystemExit('Build first: JAVA_HOME=<JDK25> gradle -p BE bootJar')
subprocess.run([executable,'-jar',str(jar)],env=env,cwd=root/'BE',check=True)
