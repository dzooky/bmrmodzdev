'use strict';
// Focus the in-car display on the current manual boundary test and ECU reference.
// Keep the complete original report for export and preserve the runner unchanged.
function drawFocusedResults(cv,theme,report,label,word,panel){
 const results=Array.isArray(report.results)?report.results:[];
 const byId=id=>results.find(r=>r.id===id);
 const status=r=>r&&['PASS','FAIL','SKIP'].includes(r.status)?r.status:'Not tested';
 const color=s=>s==='PASS'?theme.ok:s==='FAIL'?theme.crit:theme.dim;
 const row=(name,s,x,y,w)=>{
  label(cv,word(name),x,y,25,theme.text,{font:'bold'});
  label(cv,word(s),x+w,y,25,color(s),{align:'right',font:'bold'});
 };
 panel(cv,theme,24,115,767,380,null);
 panel(cv,theme,809,115,767,380,null);
 const boundary=byId('processBoundary');
 row('Process boundary',status(boundary),55,165,705);
 // The report has a fixed-format sanitized detail; split it into short visible lines.
 const detail=String(boundary&&boundary.detail||'');
 const match=detail.match(/cgroup (readable|unavailable), separate (yes|no), same UID (yes|no), process stat (readable|unavailable)/);
 if(match){
  [['Peer cgroup',match[1]],['Separate cgroup',match[2]],['Same UID',match[3]],['Process stat',match[4]]].forEach(([key,value],i)=>{
   label(cv,word(key),55,218+i*43,22,theme.text);
   label(cv,word(value),760,218+i*43,22,theme.dim,{align:'right'});
  });
 }else{
  label(cv,word('Boundary details unavailable'),55,225,22,theme.dim);
 }
 label(cv,word('Package identity NOT verified'),55,422,22,theme.warn);
 label(cv,word('Production access OFF'),55,465,20,theme.dim);
 label(cv,word('ECU reference'),840,165,25,theme.text,{font:'bold'});
 [['DDE / DPF','dde'],['EGS / transmission','egs'],['IHKA / climate','ihka'],['BDC / steering','bdc'],['ACSM / seatbelts','acsm']].forEach(([name,id],i)=>row(name,status(byId(id)),840,218+i*43,705));
 label(cv,word('Full report: Send report'),840,465,20,theme.dim);
}
module.exports={drawFocusedResults};
