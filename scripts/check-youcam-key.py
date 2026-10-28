"""Read-only YouCam API-key check. Does not upload images or create AI tasks."""
from pathlib import Path
import urllib.request,urllib.error,json,datetime
ROOT=Path(__file__).resolve().parents[1]
values={}
for line in (ROOT/'.env').read_text(encoding='utf-8-sig').splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  k,v=line.split('=',1);values[k.strip()]=v.strip().strip('\\\"\\\'')
key=values.get('YOUCAM_API_KEY','')
if not key:raise SystemExit('YOUCAM_API_KEY is not configured')
url='https://yce-api-01.makeupar.com/s2s/v2.0/credit/feature-cost?page_size=20'
def request(token):
 req=urllib.request.Request(url,headers={'Authorization':'Bearer '+token,'Accept':'application/json','User-Agent':'GiftSquire-Configuration-Check/1.0'})
 try:
  with urllib.request.urlopen(req,timeout=30) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:
  return e.code,{}
 except urllib.error.URLError:
  return None,{}
status,data=request(key)
control,_=request('giftsquire-invalid-authentication-control')
skus=data.get('result',{}).get('skus',[])
report={'checkedAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'endpoint':'GET /s2s/v2.0/credit/feature-cost','validKeyHTTPStatus':status,'providerStatus':data.get('status'),'invalidKeyHTTPStatus':control,'authenticatedKeyAccepted':status==200 and data.get('status')==200 and bool(skus),'authenticationControlRejected':control in [401,403],'featuresOnFirstPage':len(skus),'imageUploads':0,'aiTasksCreated':0,'balanceQueried':False,'featureExecutionVerified':False,'secretKeyUsed':False}
out=ROOT/'.private';out.mkdir(exist_ok=True)
(out/'youcam-key-check.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
if status==200:
 (out/'youcam-feature-cost-first-page.json').write_text(json.dumps({'skus':skus},indent=2),encoding='utf-8')
print(json.dumps(report))
if not report['authenticatedKeyAccepted'] or not report['authenticationControlRejected']:raise SystemExit(1)
