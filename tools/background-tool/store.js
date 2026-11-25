'use strict';
const fs=require('fs'),path=require('path'),{validate}=require('./engine');
function createStore(file){
 function load(){let data;try{const stat=fs.lstatSync(file);if(!stat.isFile()||stat.size>1200000)throw Error('Invalid state file');data=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(e.code==='ENOENT')return new Map();throw e;}
 if(data.version!==1||!Array.isArray(data.rules)||data.rules.length>64)throw Error('Invalid state');
 const result=new Map();for(const x of data.rules){const rule=validate(x.rule),key=rule.appId+':'+rule.ruleId;if(result.has(key)||![null,true,false].includes(x.last)||typeof x.fired!=='boolean')throw Error('Invalid state row');const row={rule,last:x.last,fired:x.fired};if(rule.trigger==='state'&&x.stateId!==undefined){if(!rule.states.some(s=>s.id===x.stateId)||!Number.isSafeInteger(x.repeatAt)||x.repeatAt<0)throw Error('Invalid state transition row');row.stateId=x.stateId;row.repeatAt=x.repeatAt;}result.set(key,row);}return result;
 }
 function save(rules){const tmp=file+'.tmp';try{const s=fs.lstatSync(tmp);if(!s.isFile()||s.uid!==process.getuid())throw Error('Invalid temporary state');fs.unlinkSync(tmp);}catch(e){if(e.code!=='ENOENT')throw e;}let fd;try{fd=fs.openSync(tmp,'wx',0o600);fs.writeFileSync(fd,JSON.stringify({version:1,rules:Array.from(rules.values())}));fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(tmp,file);}catch(e){if(fd!==undefined){fs.closeSync(fd);try{fs.unlinkSync(tmp);}catch(_){} }throw e;}}
 return {load,save};
}
module.exports={createStore};
