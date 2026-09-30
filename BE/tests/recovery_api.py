"""Invoked inside API's network namespace by the host recovery harness."""
import json, sys, time, uuid
from test_api import request

action = sys.argv[1]
if action == 'wait':
    for _ in range(100):
        try:
            if request('GET','/v1/bootstrap')[0] == 200: break
        except OSError: pass
        time.sleep(.1)
    else: raise AssertionError('API failed readiness')
    print('{}')
elif action == 'prepare':
    status, raw=request('POST','/v1/reports',{'category':'TEST','message':'backup-recovery-test'})
    assert status==201,(status,raw)
    print(raw.decode())
else:
    state=json.load(sys.stdin)
    if action == 'mutate':
        assert request('DELETE','/v1/reports/'+state['id'],token=state['deleteToken'])[0]==204
        blocked='restore-'+str(uuid.uuid4())
        status, raw=request('POST','/v1/admin/suspensions',{'ruleIds':[blocked],'flags':{'area':False},'reason':'recovery test'},'publisher')
        assert status==200,(status,raw)
        state['blocked']=blocked
        state['revision']=json.loads(raw)['revision']
        print(json.dumps(state))
    elif action == 'verify_restored':
        status, raw=request('GET','/v1/bootstrap')
        assert status==503,(status,raw)
        assert request('GET','/healthz')[0]==200
        assert request('GET','/v1/admin/reports',subject='reviewer')[0]==503
        for _ in range(2): assert request('POST','/v1/admin/recovery/replay',{},'publisher')[0]==200
        status, raw=request('GET','/v1/bootstrap')
        assert status==200
        safety=json.loads(raw)['safety']
        assert state['blocked'] in safety['blockedRuleIds']
        assert safety['revision'] >= state['revision']
        _, raw=request('GET','/v1/admin/reports',subject='reviewer')
        assert all(r['id']!=state['id'] for r in json.loads(raw))
        print('{}')
    elif action == 'journal_unavailable':
        before=json.loads(request('GET','/v1/bootstrap')[1])['safety']['revision']
        status, raw=request('POST','/v1/admin/suspensions',{'ruleIds':['must-not-apply'],'reason':'fault'},'publisher')
        assert status==503,(status,raw)
        assert json.loads(raw)['code']=='JOURNAL_UNAVAILABLE'
        assert request('GET','/v1/bootstrap')[0]==503
        print(json.dumps({'revision':before}))
    elif action == 'journal_repaired':
        assert request('POST','/v1/admin/recovery/replay',{},'publisher')[0]==200
        safety=json.loads(request('GET','/v1/bootstrap')[1])['safety']
        assert safety['revision']==state['revision']
        assert 'must-not-apply' not in safety['blockedRuleIds']
        print('{}')
    elif action == 'db_delete_failure':
        assert request('DELETE','/v1/reports/'+state['id'],token=state['deleteToken'])[0]==503
        assert request('GET','/v1/bootstrap')[0]==503
        print('{}')
    elif action == 'db_repaired':
        assert request('POST','/v1/admin/recovery/replay',{},'publisher')[0]==200
        _, raw=request('GET','/v1/admin/reports',subject='reviewer')
        assert all(r['id']!=state['id'] for r in json.loads(raw))
        print('{}')
