"""Real HTTP/PostgreSQL integration; no production rights/review claims."""
import base64, hashlib, json, os, time, urllib.request, urllib.error, unittest, uuid

BASE = os.getenv('API_URL', 'http://127.0.0.1:8080')
def request(method, path, body=None, subject=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if subject: headers['X-Local-Subject'] = subject
    if token: headers['Authorization'] = 'Bearer ' + token
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE+path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as r: return r.status, r.read()
    except urllib.error.HTTPError as e:
        try: return e.code, e.read()
        finally: e.close()

class ApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        for _ in range(100):
            try:
                if request('GET','/v1/bootstrap')[0]==200: return
            except OSError: pass
            time.sleep(.1)
        raise AssertionError('API did not become ready in 10 seconds')
    def test_01_bootstrap_hash_matches_download_and_empty_default(self):
        status, data = request('GET', '/v1/bootstrap')
        self.assertEqual(status, 200)
        b = json.loads(data)
        status, data = request('GET', b['catalogPath'])
        self.assertEqual(status, 200)
        self.assertEqual(hashlib.sha256(data).hexdigest(), b['sha256'])
        self.assertEqual(len(data), b['sizeBytes'])
        self.assertEqual(json.loads(data)['rules'], [])
        self.assertFalse(b['safety']['flags']['iosBackground'])
        self.assertFalse(b['safety']['flags']['androidBackground'])

    def test_02_admin_needs_subject_and_importer_cannot_publish(self):
        self.assertEqual(request('GET', '/v1/admin/catalogs')[0], 401)
        self.assertEqual(request('POST', '/v1/admin/rollback', {}, 'test-importer')[0], 403)

    def test_03_schema_and_reference_validation(self):
        self.assertEqual(request('POST', '/v1/admin/import', {'schemaVersion': 1}, 'author')[0], 400)
        c = empty_catalog()
        c['unexpected'] = True
        self.assertEqual(request('POST', '/v1/admin/import', c, 'author')[0], 400)
        c = empty_catalog()
        c['places'] = [{'id': 'p','name':'p','brandId':'missing','sourceId':'missing','regionId':'r', 'latitude':0,'longitude':0,
                        'autoModes':{'ios':False,'android':False,'area':False}}]
        self.assertEqual(request('POST', '/v1/admin/import', c, 'author')[0], 400)

    def test_04_review_publish_edit_conflict_and_rollback(self):
        status, data = request('GET', '/v1/bootstrap')
        self.assertEqual(status, 200)
        initial = json.loads(data)['releaseId']
        c = empty_catalog()
        status, data = request('POST', '/v1/admin/import', c, 'author')
        self.assertEqual(status, 200)
        id = json.loads(data)['id']
        review = {'reviewer':'author','evidenceRef':'empty-test','goldenTests':['empty-contract'], 'method':'HUMAN_ORIGINAL'}
        self.assertEqual(request('POST', f'/v1/admin/catalogs/{id}/publish', {'expectedReleaseId':initial}, 'publisher')[0], 403)
        self.assertEqual(request('POST', f'/v1/admin/catalogs/{id}/review', review, 'author')[0], 403)
        review['reviewer'] = 'reviewer'
        self.assertEqual(request('POST', f'/v1/admin/catalogs/{id}/review', review, 'reviewer')[0], 200)
        changed = dict(c, createdAt='2026-09-30T01:00:00Z')
        self.assertEqual(request('PATCH', f'/v1/admin/catalogs/{id}', changed, 'author')[0], 200)
        self.assertEqual(request('POST', f'/v1/admin/catalogs/{id}/publish', {'expectedReleaseId':initial}, 'publisher')[0], 403)
        self.assertEqual(request('POST', f'/v1/admin/catalogs/{id}/review', review, 'reviewer')[0], 200)
        self.assertEqual(request('POST', f'/v1/admin/catalogs/{id}/publish', {'expectedReleaseId':'wrong'}, 'publisher')[0], 409)
        status, _ = request('POST', f'/v1/admin/catalogs/{id}/publish', {'expectedReleaseId':initial}, 'publisher')
        self.assertEqual(status, 200)
        self.assertEqual(request('PATCH', f'/v1/admin/catalogs/{id}', c, 'author')[0], 409)
        b = json.loads(request('GET', '/v1/bootstrap')[1])
        _, raw = request('GET', b['catalogPath'])
        self.assertEqual(hashlib.sha256(raw).hexdigest(), b['sha256'])
        self.assertEqual(json.loads(raw)['releaseId'], c['releaseId'])
        self.assertEqual(request('POST', '/v1/admin/rollback', {'releaseId':initial,'expectedReleaseId':c['releaseId']}, 'publisher')[0], 200)

    def test_05_reports_token_hash_inbox_classify_close_delete_audit(self):
        marker = 'private-body-' + str(uuid.uuid4())
        status, data = request('POST', '/v1/reports', {'category':'DATA','message':marker})
        self.assertEqual(status, 201)
        report = json.loads(data)
        token = report['deleteToken']
        self.assertGreaterEqual(len(base64.urlsafe_b64decode(token+'='*(-len(token)%4))),32)
        self.assertEqual(request('DELETE', '/v1/reports/'+report['id'], token='wrong')[0], 403)
        status, data = request('GET','/v1/admin/reports',subject='reviewer')
        self.assertEqual(status,200)
        self.assertIn(marker,data.decode())
        self.assertNotIn(token,data.decode())
        for state in ['CLASSIFIED','CLOSED']:
            self.assertEqual(request('PATCH','/v1/admin/reports/'+report['id'], {'status':state,'category':'DATA'}, 'reviewer')[0],200)
        self.assertEqual(request('DELETE','/v1/reports/'+report['id'],token=token)[0],204)
        self.assertNotIn(marker,request('GET','/v1/admin/reports',subject='reviewer')[1].decode())
        status, audit = request('GET','/v1/admin/audit',subject='reviewer')
        self.assertEqual(status,200)
        self.assertNotIn(marker,audit.decode())
        self.assertNotIn(token,audit.decode())

    def test_06_suspension_keeps_overlay_and_replay_idempotent(self):
        status, data = request('POST','/v1/admin/suspensions',{'ruleIds':['test-block'],'sourceIds':['test-source'],'flags':{'catalog':False},'reason':'test'},'publisher')
        self.assertEqual(status,200)
        safety = json.loads(data)
        self.assertIn('test-block',safety['blockedRuleIds'])
        self.assertFalse(safety['flags']['catalog'])
        self.assertEqual(request('POST','/v1/admin/suspensions',{'flags':{'iosBackground':True},'reason':'test'},'publisher')[0],403)
        for _ in range(2):
            self.assertEqual(request('POST','/v1/admin/recovery/replay',{},'publisher')[0],200)
        b = json.loads(request('GET','/v1/bootstrap')[1])
        self.assertEqual(safety['revision'],b['safety']['revision'])
        self.assertIn('test-block',b['safety']['blockedRuleIds'])

    def test_07_report_input_limits_and_rate_limit(self):
        self.assertEqual(request('POST','/v1/reports',{'category':'DATA','message':'x'*2001})[0],400)
        self.assertEqual(request('POST','/v1/reports',{'category':'DATA','message':'valid','latitude':37})[0],400)
        statuses = [request('POST','/v1/reports',{'category':'DATA','message':'rate-test'})[0] for _ in range(12)]
        self.assertIn(429,statuses)

    def test_08_import_cannot_carry_review_and_unproven_rights_never_publish(self):
        c=empty_catalog()
        c['brands']=[{'id':'test-brand','name':'Test only'}]
        c['products']=[{'id':'test-product','name':'Test only','kind':'CARD'}]
        rights={k:False for k in ['display','transform','iosDistribution','androidDistribution','offlineCache','update','revoke']}
        rights['evidenceRef']='missing-rights-test'
        c['sources']=[{'id':'test-source','url':'https://example.invalid/test-only','documentVersion':'test-v1',
                       'checkedAt':'2026-09-01T00:00:00Z','freshUntil':'2030-01-01T00:00:00Z','rightsUntil':'2030-01-01T00:00:00Z','rights':rights}]
        review={'author':'test-author','reviewer':'reviewer','method':'HUMAN_ORIGINAL','reviewedAt':'2026-09-30T00:00:00Z','evidenceRef':'test-only','goldenTests':['test-only']}
        c['rules']=[{'id':'test-rule','version':'1','origin':'FIXTURE','title':'Test only','productId':'test-product','brandId':'test-brand','sourceId':'test-source',
                    'channels':['STORE'],'placeIds':[],'startsAt':'2026-01-01T00:00:00Z','endsAt':'2030-01-01T00:00:00Z',
                    'status':'CATALOG_REVIEWED','requiredConditions':[],'remainingWonRequired':False,'remainingUsesRequired':False,
                    'usageSteps':[],'exclusions':[],'review':review,'calculation':{'kind':'FIXED','value':100,'basis':'ORIGINAL',
                    'minimumWon':0,'minimumBasis':'ORIGINAL','capWon':100,'rounding':'FLOOR','settlement':'INSTANT'}}]
        status, raw=request('POST','/v1/admin/import',c,'author')
        self.assertEqual(status,200)
        id=json.loads(raw)['id']
        _, raw=request('GET','/v1/admin/catalogs',subject='author')
        imported=next(row for row in json.loads(raw) if row['id']==id)
        self.assertNotIn('review',imported['catalog']['rules'][0])
        self.assertEqual(imported['catalog']['rules'][0]['status'],'DRAFT')
        review={k:v for k,v in review.items() if k in ['reviewer','method','evidenceRef','goldenTests']}
        status, raw=request('POST',f'/v1/admin/catalogs/{id}/review',review,'reviewer')
        self.assertEqual(status,403)
        self.assertEqual(json.loads(raw)['code'],'RIGHTS_REQUIRED')
        for key in rights:
            if key!='evidenceRef': rights[key]=True
        self.assertEqual(request('PATCH',f'/v1/admin/catalogs/{id}',c,'author')[0],200)
        status,raw=request('POST',f'/v1/admin/catalogs/{id}/review',review,'reviewer')
        self.assertEqual(status,403)
        self.assertEqual(json.loads(raw)['code'],'RIGHTS_REQUIRED')
        initial=json.loads(request('GET','/v1/bootstrap')[1])['releaseId']
        self.assertEqual(request('POST',f'/v1/admin/catalogs/{id}/publish',{'expectedReleaseId':initial},'publisher')[0],403)

    def test_09_concurrent_publish_activates_only_one_expected_version(self):
        from concurrent.futures import ThreadPoolExecutor
        initial=json.loads(request('GET','/v1/bootstrap')[1])['releaseId']
        ids=[]
        for _ in range(2):
            status,raw=request('POST','/v1/admin/import',empty_catalog(),'author')
            self.assertEqual(status,200)
            id=json.loads(raw)['id'];ids.append(id)
            self.assertEqual(request('POST',f'/v1/admin/catalogs/{id}/review',{'reviewer':'reviewer','method':'HUMAN_ORIGINAL','evidenceRef':'empty-test','goldenTests':['empty-contract']},'reviewer')[0],200)
        with ThreadPoolExecutor(max_workers=2) as pool:
            statuses=list(pool.map(lambda id:request('POST',f'/v1/admin/catalogs/{id}/publish',{'expectedReleaseId':initial},'publisher')[0],ids))
        self.assertEqual(sorted(statuses),[200,409])
        active=json.loads(request('GET','/v1/bootstrap')[1])['releaseId']
        self.assertEqual(request('POST','/v1/admin/rollback',{'releaseId':initial,'expectedReleaseId':active},'publisher')[0],200)

def empty_catalog():
    return {'schemaVersion':1,'semanticsVersion':1,'releaseId':'empty-test-'+str(uuid.uuid4()),'createdAt':'2026-09-30T00:00:00Z',
            'brands':[],'products':[],'sources':[],'places':[],'rules':[],'combinations':[]}

if __name__ == '__main__': unittest.main(verbosity=2)
