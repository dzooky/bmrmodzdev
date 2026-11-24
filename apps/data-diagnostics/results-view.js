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
 // Only the current observation, no raw IDs or file paths.
 const survey=boundary&&boundary.packageSurvey;
 const available=survey&&survey.available===true;
 const candidate=available&&survey.candidate==='data-diagnostics'?'Diagnostics':
  available&&survey.candidate==='dpf-dev'?'DPF DEV':'Unknown';
 const yn=value=>available?(value?'Yes':'No'):'Unknown';
 const meta=survey&&survey.evidence||{};
 const fields=[['Owner consistency','ownerMatch'],['Owner account','ownerAccount'],['Ancestor mode guard','ancestorGuard'],
  ['Peer write mode','peerWrite'],['Entry point mode','entryPoint'],['Mount namespace','mountNamespace'],['Effective capabilities','capabilities']];
 fields.forEach(([name,key],i)=>{
  const value=["unknown","match","different","root-account","peer-account","other-account","ambiguous","not-listed","mode-clear","mode-risk","mode-match","same","none","present","unavailable"].includes(meta[key])?meta[key]:'unknown';
  label(cv,word(name),55,200+i*31,22,theme.text);
  label(cv,word(value),760,200+i*31,22,theme.dim,{align:'right'});
 });
 label(cv,word('Package identity NOT verified'),55,422,22,theme.warn);
 label(cv,word('Production access OFF'),55,465,20,theme.dim);
 label(cv,word('ECU reference'),840,165,25,theme.text,{font:'bold'});
 [['DDE / DPF','dde'],['EGS / transmission','egs'],['IHKA / climate','ihka'],['BDC / steering','bdc'],['ACSM / seatbelts','acsm']].forEach(([name,id],i)=>row(name,status(byId(id)),840,218+i*43,705));
 label(cv,word('Full report: Send report'),840,465,20,theme.dim);
}
module.exports={drawFocusedResults};
