'use strict';
const {Canvas}=require('./canvas');
const WIDTH=430, HEIGHT=76;
function prepare(segments){
  if(!Array.isArray(segments)||segments.length<1||segments.length>8)throw Error('Invalid segments');
  let count=0;
  const items=segments.map(s=>{
    if(!s||typeof s.text!=='string'||!/^#[0-9a-fA-F]{6}$/.test(s.color)||!Number.isInteger(s.blinkMs)||s.blinkMs<0||s.blinkMs>3000||(s.blinkMs>0&&s.blinkMs<125))throw Error('Invalid segment');
    count+=Array.from(s.text).length;
    return {text:s.text,color:s.color,blinkMs:s.blinkMs};
  });
  if(count<1||count>90)throw Error('Invalid text length');
  const style={font:'bold',literal:true},cv=new Canvas(WIDTH,HEIGHT);
  let font=28;
  const width=()=>items.reduce((n,s)=>n+cv.textWidth(s.text,font,style),0);
  while(font>15&&width()>WIDTH-16)font--;
  const total=width();
  if(total>WIDTH-16)throw Error('Notification too wide');
  let x=Math.round((WIDTH-total)/2);
  const layers=items.map(s=>{
    const layer=new Canvas(WIDTH,HEIGHT);
    layer.text(s.text,x+1,49,font,[0,0,0,190],style);
    layer.text(s.text,x,47,font,s.color,style);
    x+=cv.textWidth(s.text,font,style);
    return {layer,blinkMs:s.blinkMs};
  });
  return {frameAt(ms){
    const out=new Canvas(WIDTH,HEIGHT);
    layers.forEach(s=>{if(!s.blinkMs||Math.floor(ms/s.blinkMs)%2===0)out.blit(s.layer,0,0);});
    return Buffer.from(out.d);
  },nextAt(ms){
    return layers.reduce((n,s)=>s.blinkMs?Math.min(n,(Math.floor(ms/s.blinkMs)+1)*s.blinkMs):n,Infinity);
  }};
}
module.exports={prepare};
