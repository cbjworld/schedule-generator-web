export const parseNames = raw => String(raw ?? '').trim().split(/[,\-\s]+/u).filter(Boolean);
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export function parseDays(raw, count) {
  const tokens = String(raw ?? '').trim().split(/[,\s]+/u).filter(Boolean);
  const days = tokens.map(t => {
    if (!/^\d+일?$/u.test(t)) throw new Error('일자는 쉼표로 구분한 숫자로 입력해 주세요.');
    const n = Number(t.replace('일',''));
    if (n < 1 || n > count) throw new Error(`이 달의 일자는 1~${count}일입니다.`);
    return n;
  });
  return new Set(days);
}
export function resolveStart(value, workers, fallback = 0) {
  const v = String(value ?? '').trim();
  if (!v) return fallback % workers.length;
  if (/^\d+$/.test(v)) {
    const n = Number(v);
    if (!Number.isSafeInteger(n) || n < 1 || n > workers.length) throw new Error(`시작 순번은 1~${workers.length} 또는 명단의 이름을 입력해 주세요.`);
    return n - 1;
  }
  const i = workers.indexOf(v);
  if (i < 0) throw new Error(`'${v}'은(는) 명단에 없는 이름입니다.`);
  return i;
}
export function generate(input, holidayData, previous = {}) {
  const year = Number(input.year), month = Number(input.month), size = Number(input.group_size);
  if (!Number.isInteger(year) || year < holidayData.minYear || year > holidayData.maxYear) throw new Error(`연도는 ${holidayData.minYear}~${holidayData.maxYear}로 입력해 주세요.`);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('월은 1~12로 입력해 주세요.');
  if (!Number.isInteger(size) || size < 1 || size > 100) throw new Error('하루 인원은 1~100명으로 입력해 주세요.');
  const mode = input.mode;
  if (!['weekday','weekend','separate','shared','integrated'].includes(mode)) throw new Error('운영 방식을 선택해 주세요.');
  let weekday = parseNames(input.weekday), weekend = parseNames(input.weekend);
  if (mode === 'shared') weekday = [...weekend];
  if (mode === 'weekend') weekday = [];
  if (['weekday','integrated'].includes(mode)) weekend = [];
  for (const [label,pool,needed] of [['평일',weekday,mode !== 'weekend'],['주말',weekend,!['weekday','integrated'].includes(mode)]]) {
    if (!needed) continue;
    if (!pool.length) throw new Error(`${label} 근무자 명단을 입력해 주세요.`);
    if (pool.length > 500 || pool.some(n => n.length > 50)) throw new Error('명단은 500명 이하, 이름은 50자 이하로 입력해 주세요.');
    if (new Set(pool).size !== pool.length) throw new Error(`${label} 명단에 같은 이름이 있습니다. 동명이인은 구분해서 입력해 주세요.`);
    if (size > pool.length) throw new Error(`${label} 명단보다 하루 배정 인원이 많습니다.`);
  }
  const count = new Date(year,month,0).getDate();
  const excluded = parseDays(input.excluded,count), additional = parseDays(input.additional,count), manualHolidays = parseDays(input.extra_holidays,count);
  const start = (key,pool,manual) => pool.length ? resolveStart(manual,pool,same(previous[`workers_${key}`],pool) ? (previous[`start_index_${key}`] || 0) : 0) : 0;
  let wi = start('weekday',weekday,input.start_weekday), ei = start('weekend',weekend,input.start_weekend);
  const initial = {weekday:wi,weekend:ei};
  const days = [];
  for (let day = 1; day <= count; day++) {
    const date = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dow = new Date(year,month-1,day).getDay();
    const holiday = holidayData.dates[date] || (manualHolidays.has(day) ? '추가 공휴일' : '');
    const off = dow === 0 || dow === 6 || Boolean(holiday);
    const target = mode === 'integrated' || !['weekday','weekend'].includes(mode) || (mode === 'weekday' ? !off : off) || additional.has(day);
    let workers = [], closed = false;
    if (target && excluded.has(day)) closed = true;
    else if (target) {
      const useWeekday = mode === 'integrated' || mode === 'weekday' || (mode !== 'weekend' && !off);
      const pool = useWeekday ? weekday : weekend;
      const index = useWeekday ? wi : ei;
      workers = Array.from({length:size},(_,i)=>pool[(index+i)%pool.length]);
      if (useWeekday) wi = (index+size)%pool.length; else ei = (index+size)%pool.length;
    }
    days.push({day,date,dow,holiday,off,target,closed,workers,additional:additional.has(day)});
  }
  const title = String(input.title || '보안근무자').trim() || '보안근무자';
  if (title.length > 100) throw new Error('제목은 100자 이하로 입력해 주세요.');
  return {year,month,title,mode,size,days,initial,weekday,weekend,next:{title,group_size:size,day_type:mode==='weekday'||mode==='weekend'?mode:'both',separate:mode==='separate',integrated:mode==='integrated',workers_weekday:weekday,workers_weekend:weekend,start_index_weekday:wi,start_index_weekend:ei,last_year:year,last_month:month}};
}
export function inputFromState(s) {
  if (!s || typeof s !== 'object' || !Array.isArray(s.workers_weekday) || !Array.isArray(s.workers_weekend)) throw new Error('올바른 순번 백업 파일이 아닙니다.');
  for (const key of ['workers_weekday','workers_weekend']) {
    if (s[key].length > 500 || s[key].some(n=>typeof n !== 'string' || !n.trim() || n.length > 50 || parseNames(n).length !== 1)) throw new Error('백업의 근무자 명단을 확인해 주세요.');
  }
  for (const key of ['start_index_weekday','start_index_weekend']) if (!Number.isSafeInteger(s[key] ?? 0) || (s[key] ?? 0)<0) throw new Error('백업 순번이 올바르지 않습니다.');
  if (!Number.isInteger(s.last_year) || s.last_year<2000 || s.last_year>2050 || !Number.isInteger(s.last_month) || s.last_month<1 || s.last_month>12 || !Number.isInteger(s.group_size) || s.group_size<1 || s.group_size>100 || typeof s.title!=='string' || s.title.length>100) throw new Error('백업의 연월, 제목 또는 하루 인원을 확인해 주세요.');
  if (!['weekday','weekend','both'].includes(s.day_type)) throw new Error('백업의 운영 방식이 올바르지 않습니다.');
  const next = new Date(s.last_year,s.last_month,1);
  return {title:s.title,year:next.getFullYear(),month:next.getMonth()+1,group_size:s.group_size,mode:s.integrated?'integrated':s.day_type==='both'?(s.separate?'separate':'shared'):s.day_type,weekday:s.workers_weekday.join(', '),weekend:s.workers_weekend.join(', '),start_weekday:'',start_weekend:'',excluded:'',additional:'',extra_holidays:''};
}
