'use strict';
const {validate}=require('./engine');
const appId=s=>typeof s==='string'&&/^[a-z][a-z0-9_-]{0,31}$/.test(s)&&s!=='diagnostics'&&s!=='background-test';
function notification(a){
 if(!a||a.type!=='notification'||a.name!=='kombi')throw Error('Only KOMBI notifications supported');
 const p=a.payload;
 if(!p||Object.keys(p).some(k=>!['durationMs','ttlMs','segments'].includes(k))||!Number.isInteger(p.durationMs)||p.durationMs<500||p.durationMs>15000||!Number.isInteger(p.ttlMs)||p.ttlMs<1000||p.ttlMs>60000||!Array.isArray(p.segments)||p.segments.length<1||p.segments.length>8)throw Error('Invalid notification payload');
 let count=0;
 for(const s of p.segments){if(!s||Object.keys(s).some(k=>!['text','color','blinkMs'].includes(k))||typeof s.text!=='string'||!/^#[0-9a-fA-F]{6}$/.test(s.color)||!Number.isInteger(s.blinkMs)||s.blinkMs<0||s.blinkMs>3000||(s.blinkMs>0&&s.blinkMs<125))throw Error('Invalid segment');count+=Array.from(s.text).length;}
 if(count<1||count>90)throw Error('Invalid text length');
 return p;
}
function request(req,rt){
 if(!req||req.api!==1||!appId(req.appId))throw Error('Invalid app ID');
 const owner=req.appId;
 if(req.op==='register'||req.op==='update'){
  const rule=validate(req.rule);if(rule.appId!==owner)throw Error('App ID mismatch');
  rule.actions.forEach(notification);
  return rt.request({api:1,op:req.op,rule},owner);
 }
 if(req.op==='unregister')return rt.request({api:1,op:req.op,ruleId:req.ruleId},owner);
 if(req.op==='status')return rt.request({api:1,op:'status'},owner);
 throw Error('Unsupported operation');
}
module.exports={request,notification,appId};
