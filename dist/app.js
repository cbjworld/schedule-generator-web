import {generate,parseNames,inputFromState} from './engine.js';
import {makeWorkbook} from './excel.js';
const $ = id => document.getElementById(id);
const form = $('settings'), key = 'schedule-generator-v1';
let holidays, result, previous = {}, saveFailed = false;
const today = new Date();
for(let m=1;m<=12;m++) $('month').add(new Option(`${m}월`,String(m)));
$('year').value=today.getFullYear();$('month').value=today.getMonth()+1;
const fields=['title','year','month','group_size','mode','weekday','weekend','start_weekday','start_weekend','excluded','additional','extra_holidays'];
function read(){const v=Object.fromEntries(fields.map(k=>[k,$(k).value]));if(v.mode==='shared')v.start_weekday=$('shared_weekday_start').value;return v;}
function fill(v){for(const k of fields)if(v[k]!==undefined)$(k).value=String(v[k]);$('shared_weekday_start').value=v.start_weekday||'';}
function message(text,type=''){ $('message').textContent=text;$('message').className=type; }
function persist(){try{localStorage.setItem(key,JSON.stringify({version:1,previous,draft:read()}));saveFailed=false;}catch{saveFailed=true;message('브라우저에 저장하지 못했습니다. 설정 백업으로 순번을 보관해 주세요.','error');}}
function modes(){const m=$('mode').value;$('weekday-fields').hidden=['weekend','shared'].includes(m);$('weekend-fields').hidden=['weekday','integrated'].includes(m);$('shared-start').hidden=m!=='shared';$('weekday-label').textContent=m==='integrated'?'근무자 순번 (매일 통합)':'평일 근무자';$('weekend-label').textContent=m==='shared'?'공통 근무자 명단':'주말·공휴일 근무자';
$('mode-hint').textContent={weekday:'토요일, 일요일, 공휴일을 제외한 평일에 배정합니다.',weekend:'토요일, 일요일, 공휴일에 배정합니다.',separate:'평일과 주말·공휴일에 각각의 명단과 순번을 사용합니다.',shared:'명단은 같지만 평일과 주말의 순번은 각각 진행됩니다.',integrated:'요일 구분 없이 하나의 순번으로 매일 배정합니다.'}[m];}
function hints(){for(const k of ['weekday','weekend']){const pool=parseNames($(k).value);const matching=JSON.stringify(pool)===JSON.stringify(previous[`workers_${k}`]);const i=matching?(previous[`start_index_${k}`]||0):0; $(`${k}-hint`).textContent=pool.length?`자동 시작: ${pool[i%pool.length]} · 총 ${pool.length}명`:'';}}
function draw(r){const y=Number($('year').value),m=Number($('month').value);$('calendar-title').textContent=`${y}년 ${m}월`;$('calendar-body').replaceChildren();
if(!Number.isInteger(y)||y<2000||y>2050||!Number.isInteger(m)||m<1||m>12)return;
const n=new Date(y,m,0).getDate(),offset=new Date(y,m-1,1).getDay();
let row;
for(let i=0;i<Math.ceil((offset+n)/7)*7;i++){
if(i%7===0){row=document.createElement('tr');$('calendar-body').append(row);}const td=document.createElement('td');row.append(td);const d=i-offset+1;if(d<1||d>n){td.className='empty';continue;}
const date=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
const item=r?.days[d-1]||{day:d,dow:i%7,holiday:holidays?.dates[date]||'',workers:[]};
if(item.dow===0||item.holiday)td.classList.add('sun');else if(item.dow===6)td.classList.add('sat');if(item.closed)td.classList.add('closed');
const number=document.createElement('span');number.className='date-number';number.textContent=d;td.append(number);
if(item.additional){const s=document.createElement('span');s.className='extra-tag';s.textContent='+';s.title='추가근무일';td.append(s);}
if(item.holiday){const h=document.createElement('span');h.className='holiday-name';h.textContent=item.holiday;td.append(h);}
if(item.closed){const c=document.createElement('span');c.className='closed-label';c.textContent='미운영';td.append(c);}
for(const name of item.workers){const s=document.createElement('span');s.className='worker';s.textContent=name;td.append(s);}
}
const metric=(id,n,unit)=>{const el=$(id);el.textContent=String(n);const small=document.createElement('small');small.textContent=unit;el.append(small);};
metric('assigned-count',r?r.days.filter(d=>d.workers.length).length:'—','일');metric('people-count',r?new Set(r.days.flatMap(d=>d.workers)).size:'—','명');metric('closed-count',r?r.days.filter(d=>d.closed).length:'—','일');
$('preview-label').textContent=r?'입력한 설정이 반영된 미리보기':'명단을 입력하면 배정이 표시됩니다';
}
function refresh(quiet=false){modes();hints();result=null;$('download').disabled=true;$('confirm').disabled=true;message('');if(!holidays){draw(null);return;}
try{result=generate(read(),holidays,previous);draw(result);$('download').disabled=false;$('confirm').disabled=false;const parts=[];for(const k of ['weekday','weekend'])if(result[k].length)parts.push(`${result.mode==='integrated'?'통합':k==='weekday'?'평일':'주말'}: ${result[k][result.next[`start_index_${k}`]]}`);$('next-hint').textContent=`확정 후 이어질 순번 · ${parts.join(' / ')}`;}
catch(e){draw(null);$('next-hint').textContent='배정을 확인한 뒤 순번을 확정해 주세요.';if(!quiet||parseNames($('weekday').value).length||parseNames($('weekend').value).length)message(e.message,'error');}
if(saveFailed)message('자동 저장을 사용할 수 없습니다. 설정 백업을 보관해 주세요.','error');}
function saveBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
form.addEventListener('submit',e=>{e.preventDefault();refresh();persist();});
form.addEventListener('input',()=>{refresh(true);persist();});
function shift(delta){const y=Number($('year').value),m=Number($('month').value);if(!Number.isInteger(y)||!Number.isInteger(m))return;const d=new Date(y,m-1+delta,1);if(d.getFullYear()<2000||d.getFullYear()>2050){message('지원 연도는 2000~2050년입니다.','error');return;}$('year').value=d.getFullYear();$('month').value=d.getMonth()+1;for(const k of ['excluded','additional','extra_holidays'])$(k).value='';refresh(true);persist();}
$('prev').onclick=()=>shift(-1);$('next').onclick=()=>shift(1);$('today').onclick=()=>{$('year').value=today.getFullYear();$('month').value=today.getMonth()+1;for(const k of ['excluded','additional','extra_holidays'])$(k).value='';refresh(true);persist();};
$('download').onclick=async()=>{refresh();if(!result)return;const snapshot=result;$('download').disabled=true;try{if(!window.ExcelJS)throw new Error('엑셀 도구를 불러오지 못했습니다. 페이지를 새로고침해 주세요.');const wb=makeWorkbook(window.ExcelJS,snapshot);const bytes=await wb.xlsx.writeBuffer();saveBlob(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${snapshot.title.replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_')}_${snapshot.year}년${snapshot.month}월.xlsx`);message('엑셀 다운로드를 시작했습니다. 순번을 이어가려면 배정 확인 후 아래 버튼으로 확정하세요.','success');}catch(e){message(e.message,'error');}finally{$('download').disabled=!result;}};
$('confirm').onclick=()=>{refresh();if(!result)return;if(result.year===2050&&result.month===12){message('지원 기간의 마지막 달입니다. 엑셀과 백업을 내려받아 보관해 주세요.','error');return;}previous=result.next;fill(inputFromState(previous));refresh(true);persist();if(!saveFailed)message('순번을 저장했습니다. 다음 달 배정이 이어서 표시됩니다.','success');};
$('backup').onclick=()=>saveBlob(new Blob([JSON.stringify({version:1,previous,draft:read()},null,2)],{type:'application/json'}),'근무표_설정백업.json');
$('import-button').onclick=()=>$('import-file').click();
$('import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>1000000)throw new Error('백업 파일은 1MB 이하만 불러올 수 있습니다.');const data=JSON.parse(await file.text());let nextPrevious,nextDraft;if(data.version===1){nextPrevious=data.previous||{};if(Object.keys(nextPrevious).length)inputFromState(nextPrevious);if(!data.draft||typeof data.draft!=='object')throw new Error('백업 설정이 없습니다.');nextDraft=data.draft;generate(nextDraft,holidays,nextPrevious);}else{nextPrevious=data;nextDraft=inputFromState(data);generate(nextDraft,holidays,nextPrevious);}previous=nextPrevious;fill(nextDraft);refresh();persist();if(!saveFailed)message('백업 설정과 이어질 순번을 불러왔습니다.','success');}catch(err){message(`불러오기 실패: ${err.message}`,'error');}finally{e.target.value='';}};
try{const raw=localStorage.getItem(key);if(raw){const s=JSON.parse(raw);if(s.version!==1||!s.draft)throw new Error('알 수 없는 저장 형식');if(s.previous&&Object.keys(s.previous).length)inputFromState(s.previous);previous=s.previous||{};fill(s.draft);}}catch{message('저장된 설정을 읽지 못했습니다. 백업을 불러오거나 명단을 다시 입력해 주세요.','error');}
modes();draw(null);
try{const response=await fetch('holidays.json');if(!response.ok)throw new Error();holidays=await response.json();refresh(true);}catch{message('공휴일 자료를 불러오지 못했습니다. 인터넷 연결을 확인하고 새로고침해 주세요.','error');}
