export function makeWorkbook(ExcelJS, result) {
  const wb = new ExcelJS.Workbook();
  wb.creator = '차례 근무표 생성기';
  const ws = wb.addWorksheet(`${result.month}월`);
  ws.columns = Array.from({length:7},()=>({width:17}));
  ws.mergeCells('A1:G1');
  ws.getCell('A1').value = `${result.year}년 ${result.month}월 ${result.title}`;
  ws.getCell('A1').font = {name:'맑은 고딕',bold:true,size:28};
  ws.getCell('A1').alignment = {horizontal:'center',vertical:'middle'};
  ws.getRow(1).height = 49.5;
  ws.getRow(2).values = ['일','월','화','수','목','금','토'];
  ws.getRow(2).height = 19.5;
  const border = {top:{style:'thin'},bottom:{style:'thin'},left:{style:'thin'},right:{style:'thin'}};
  for(let c=1;c<=7;c++) {
    const cell = ws.getCell(2,c);
    cell.font = {name:'맑은 고딕',bold:true,size:16,color:{argb:c===1?'FFFF0000':c===7?'FF0070C0':'FF000000'}};
    cell.fill = {type:'pattern',pattern:'solid',fgColor:{argb:'FFD9E1F2'}};
    cell.alignment = {horizontal:'center',vertical:'middle'};
    cell.border = border;
  }
  const offset = result.days[0].dow;
  const weeks = Math.ceil((offset + result.days.length)/7);
  for(let w=0;w<weeks;w++) {
    const r = 3+w*2;
    ws.getRow(r).height = 19.5;
    ws.getRow(r+1).height = Math.max(66.75,result.size*19+12);
    for(let col=1;col<=7;col++) {
      const d = result.days[w*7+col-1-offset];
      const dateCell = ws.getCell(r,col), namesCell = ws.getCell(r+1,col);
      for(const cell of [dateCell,namesCell]) {cell.border=border;cell.alignment={horizontal:'center',vertical:'middle',wrapText:true};}
      if(!d) continue;
      dateCell.value=d.day;
      dateCell.font={name:'맑은 고딕',bold:true,size:16,color:{argb:d.dow===0||d.holiday?'FFFF0000':d.dow===6?'FF0070C0':'FF000000'}};
      // Strings are kept as text, including names that begin with spreadsheet formula characters.
      namesCell.value=d.closed?'(미운영)':d.workers.length?d.workers.join('\n'):d.holiday||'';
      namesCell.font={name:'맑은 고딕',bold:true,size:13};
      const fill=d.dow===0||d.holiday?'FFFCE4EC':d.dow===6?'FFDEEAF6':d.workers.length?'FFFFF2CC':null;
      if(fill) namesCell.fill={type:'pattern',pattern:'solid',fgColor:{argb:fill}};
      if(d.holiday) dateCell.note=d.holiday;
    }
  }
  let row = 3+weeks*2;
  const footers = result.mode==='integrated' ? [`근무자 순번(통합): ${result.weekday.join('-')}`] : result.mode==='separate' ? [`평일 순번: ${result.weekday.join('-')}`,`주말 순번: ${result.weekend.join('-')}`] : [`근무자 순번: ${(result.weekend.length?result.weekend:result.weekday).join('-')}`];
  for(const text of footers){ws.mergeCells(row,1,row,7);const cell=ws.getCell(row,1);cell.value=text;cell.font={name:'맑은 고딕',size:10};cell.alignment={wrapText:true,vertical:'middle'};ws.getRow(row).height=30;row++;}
  ws.pageSetup={paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:1,printArea:`A1:G${row-1}`,horizontalCentered:true};
  return wb;
}
