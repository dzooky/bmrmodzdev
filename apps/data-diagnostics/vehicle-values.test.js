'use strict';
const assert=require('assert');
const {identification,transmission,footwell,engineCds}=require('./vehicle-values');
const id={ok:true,uds:[0x62,0xF1,0x50,0x0F,0x25,0xD0]};
assert.strictEqual(identification(id),'0F25D0');
assert.strictEqual(identification({ok:true,uds:[0x62,0xF1,0x50]}),null);
assert.strictEqual(transmission({ok:true,uds:[0x62,0x60,0,100]},'0F25D0'),60);
assert.strictEqual(transmission({ok:true,uds:[0x62,0x60,0,100]},'unknown'),null);
assert.strictEqual(transmission({ok:true,uds:[0x62,0x60,0,100,0]},'0F25D0'),null);
const sample=Array(19).fill(20);
sample[0]=0x62;sample[1]=0xD8;sample[2]=0xD7;
sample[6]=0xFF;sample[7]=0x7F;sample[11]=22;sample[12]=30;
assert.deepStrictEqual(footwell({ok:true,uds:sample}),{
 frontLeft:-1,frontRight:null,rearLeft:22,rearRight:30
});
assert.strictEqual(footwell({ok:true,uds:sample.slice(0,18)}),null);
assert.deepStrictEqual(engineCds({ok:true,fields:{oil:{valid:true},coolant:{valid:true},rpm:{valid:false}},
 values:{oil:142,coolant:136,rpm:1200}}),{oil:94,coolant:88,rpm:null});
assert.deepStrictEqual(engineCds({ok:true,fields:{oil:{valid:true},coolant:{valid:true},rpm:{valid:true}},
 values:{oil:58,coolant:64,rpm:1000}}),{oil:10,coolant:16,rpm:250});
assert.deepStrictEqual(engineCds({ok:true,fields:{oil:{valid:true},coolant:{valid:true},rpm:{valid:true}},
 values:{oil:255,coolant:255,rpm:65535}}),{oil:null,coolant:null,rpm:null});
console.log('Vehicle values: OSA EGS identity/ATF, IHKA signed footwell and CDS guarded readings passed');
