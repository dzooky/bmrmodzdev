'use strict';
const en={Info:'Info',Capture:'Capture',Results:'Results',Parked:'Stay parked during the test',Next:'Capture next event',Complete:'Capture complete',Saved:'Saved locally',Error:'Save failed',Pending:'No capture yet',Unavailable:'Unavailable',Processes:'Matching processes',Interfaces:'Network interfaces',Sockets:'Visible sockets',Skipped:'Unreadable process entries',Reset:'New session'};
module.exports={t:key=>en[key]||key,en};
