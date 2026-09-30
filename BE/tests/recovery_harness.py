"""Destructive ONLY to this project's disposable local test DB. Snapshot stays in memory."""
import hashlib, json, pathlib, subprocess

ROOT=pathlib.Path(__file__).resolve().parents[2]
COMPOSE=['docker','compose','-f',str(ROOT/'infra/local/compose.yml'),'--env-file',str(ROOT/'infra/local/.env')]
def command(args,data=None):
    return subprocess.run(COMPOSE+args,input=data,capture_output=True,check=True).stdout
def sql(statement):
    return command(['exec','-T','db','psql','-X','-U','hyetaekpass','-d','hyetaekpass','-At','-c',statement]).decode().strip()
def api(action,state=None):
    out=command(['run','-T','--rm','--no-deps','test','python','/tests/recovery_api.py',action],json.dumps(state or {}).encode())
    return json.loads(out)

command(['restart','api'])  # The preceding rate-limit test exhausts this disposable process quota.
api('wait')
state=api('prepare')
stored=sql("SELECT token_hash FROM error_report WHERE id='"+state['id']+"'")
assert stored==hashlib.sha256(state['deleteToken'].encode()).hexdigest()
snapshot=command(['exec','-T','db','pg_dump','-U','hyetaekpass','-d','hyetaekpass','-Fc'])
state=api('mutate',state)
command(['exec','-T','db','pg_restore','-U','hyetaekpass','-d','hyetaekpass','--clean','--if-exists','--exit-on-error'],snapshot)
assert sql("SELECT count(*) FROM error_report WHERE id='"+state['id']+"'")=='1'
api('verify_restored',state)
assert sql("SELECT count(*) FROM error_report WHERE id='"+state['id']+"'")=='0'
print('PASS: pg_dump/restore -> bootstrap and inbox 503 -> replay -> deletion/block restored, revision monotonic')

command(['exec','-T','--user','0','api','chmod','0555','/journal'])
try: state=api('journal_unavailable')
finally: command(['exec','-T','--user','0','api','chmod','0755','/journal'])
api('journal_repaired',state)
print('PASS: journal fsync write failure -> 503 -> no DB suspension -> repaired replay')

state=api('prepare')
sql('CREATE TRIGGER test_delete_failure BEFORE DELETE ON error_report FOR EACH ROW EXECUTE FUNCTION reject_mutation()')
try: api('db_delete_failure',state)
finally: sql('DROP TRIGGER test_delete_failure ON error_report')
assert sql("SELECT count(*) FROM error_report WHERE id='"+state['id']+"'")=='1'
api('db_repaired',state)
assert sql("SELECT count(*) FROM error_report WHERE id='"+state['id']+"'")=='0'
print('PASS: DB deletion failure after independent journal commit -> bootstrap 503 -> replay deletes')
sql("DELETE FROM error_report WHERE category='DATA' AND message='rate-test'")
