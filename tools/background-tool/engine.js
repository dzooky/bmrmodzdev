'use strict';
// Declarative engine; no arbitrary code, shell or vehicle writes.
const id=s=>typeof s==='string'&&/^[a-zA-Z0-9_.-]{1,96}$/.test(s);
const ops={eq:(a,b)=>a===b,ne:(a,b)=>a!==b,gt:(a,b)=>a>b,gte:(a,b)=>a>=b,lt:(a,b)=>a<b,lte:(a,b)=>a<=b};
function validate(r){
 if(!r||r.api!==1||!id(r.appId)||!id(r.ruleId)||!Array.isArray(r.fields)||!r.fields.length||r.fields.length>12)throw Error('Invalid rule');
 const names=new Set();
 for(const f of r.fields){if(!f||!id(f.name)||names.has(f.name)||!Number.isInteger(f.freshnessMs)||f.freshnessMs<5000||f.freshnessMs>300000)throw Error('Invalid field');names.add(f.name);}
 function condition(c,depth){if(!c||depth>4)throw Error('Invalid condition');if(c.all||c.any){const a=c.all||c.any;if(c.all&&c.any||!Array.isArray(a)||!a.length||a.length>8)throw Error('Invalid group');a.forEach(x=>condition(x,depth+1));return;}if(!names.has(c.field)||!Object.prototype.hasOwnProperty.call(ops,c.op)||!Number.isFinite(c.value))throw Error('Invalid comparison');}
 condition(r.condition,0);
 if(!['rising','once'].includes(r.trigger)||!Array.isArray(r.actions)||!r.actions.length||r.actions.length>4)throw Error('Invalid trigger/actions');
 for(const a of r.actions){if(!a||!['notification','action'].includes(a.type)||!id(a.name)||!a.payload||typeof a.payload!=='object'||Array.isArray(a.payload)||JSON.stringify(a.payload).length>2048)throw Error('Invalid action');}
 if(JSON.stringify(r).length>16384)throw Error('Rule too large');
 return JSON.parse(JSON.stringify(r));
}
function evaluate(r,samples,now){
 for(const f of r.fields){const s=samples[f.name];if(!s||s.valid!==true||!Number.isFinite(s.value)||!Number.isFinite(s.sampledAt)||s.sampledAt>now||now-s.sampledAt>3*f.freshnessMs)return null;}
 function test(c){if(c.all)return c.all.every(test);if(c.any)return c.any.some(test);return ops[c.op](samples[c.field].value,c.value);}
 return test(r.condition);
}
class Engine{
 constructor(save,dispatch){this.rules=new Map();this.save=save;this.dispatch=dispatch;}
 key(a,b){return a+':'+b;}
 register(input){const r=validate(input),k=this.key(r.appId,r.ruleId),old=this.rules.get(k);if(old&&JSON.stringify(old.rule)===JSON.stringify(r))return;if(!old&&this.rules.size>=64)throw Error('Rule limit');
 const others=Array.from(this.rules.entries()).filter(([key])=>key!==k).map(([,v])=>v.rule);
 if(others.filter(v=>v.appId===r.appId).length>=8)throw Error('App rule limit');
 const fields=new Set();others.concat([r]).forEach(v=>v.fields.forEach(f=>fields.add(f.name)));
 if(fields.size>11&&r.appId!=='diagnostics'||fields.size>12)throw Error('Shared field limit');const next=new Map(this.rules);next.set(k,{rule:r,last:null,fired:false});this.save(next);this.rules=next;}
 unregister(a,b){if(!this.rules.has(this.key(a,b)))return;const next=new Map(this.rules);next.delete(this.key(a,b));this.save(next);this.rules=next;}
 demand(){const d=Object.create(null);for(const x of this.rules.values())for(const f of x.rule.fields)d[f.name]=Math.min(d[f.name]||Infinity,f.freshnessMs);return d;}
 async tick(samples,now){for(const [k,x] of Array.from(this.rules)){try{if(this.rules.get(k)!==x)continue;const result=evaluate(x.rule,samples,now);if(result===null)continue;const fire=result&&x.last!==true&&!(x.rule.trigger==='once'&&x.fired);if(result===x.last&&!fire)continue;const next=new Map(this.rules);next.set(k,{rule:x.rule,last:result,fired:x.fired||fire});this.save(next);this.rules=next;if(fire)for(const a of x.rule.actions){try{if(this.rules.get(k)!==next.get(k))break;await this.dispatch(a,k);}catch(e){/* Independent action failures; no ambiguous automatic retries. */}}}catch(e){/* Isolate rule failures. */}}}
}
module.exports={Engine,validate,evaluate};
