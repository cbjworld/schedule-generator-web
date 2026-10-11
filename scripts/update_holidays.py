"""Regenerate the bundled calendar after upgrading python-holidays as needed."""
import json
from pathlib import Path
import holidays
# shortcut: bundled calendar supports 2000–2050; regenerate after holiday rule changes or before extending the range.
data = holidays.KR(years=range(2000,2051), language='ko')
out = Path(__file__).resolve().parents[1] / 'dist' / 'holidays.json'
out.write_text(json.dumps({'minYear':2000,'maxYear':2050,'version':holidays.__version__,'dates':{str(k):v for k,v in sorted(data.items())}}, ensure_ascii=False, separators=(',',':')), encoding='utf-8')
