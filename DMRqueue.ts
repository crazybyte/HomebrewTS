
import { DMRFrame } from './DMRFrame';
import { DMRUtils } from './DMRUtils';
import Queue from 'bull';



/**
 * Class to send dmr frames to to a queue for further processing
 *   
 */
 export class DMRQueue {
    
    dmrutils: DMRUtils = new DMRUtils();
    tgQueues: Map<number,Queue.Queue> = new Map<number,Queue.Queue>() // Map available queues
    
    constructor() {
        this.tgQueues.set(214, new Queue('TG214', {redis: {port: 6379, host: '127.0.0.1'}}));
        this.tgQueues.set(24012, new Queue('TG24012', {redis: {port: 6379, host: '127.0.0.1'}}));
    }
    
    /**
     * Send complete DMR frame to the queue
     */
    send(data: Buffer) {

        let dmrFrame: DMRFrame = DMRFrame.fromBuffer(data);
        const qdata = { message: data.toString('hex')}
        let tg = dmrFrame.dmrData.destination;
        //console.log("Sending to queue TG" + tg);
        
        if (this.tgQueues.has(tg)) {
            let q = this.tgQueues.get(tg);
            if (q != undefined ) {
                q.add(qdata);
            }
        } else {
            let newQueue = new Queue('TG'+tg.toString(), {redis: {port: 6379, host: '127.0.0.1'}});
            this.tgQueues.set(tg, newQueue);
            newQueue.add(qdata);
        }
    }
}
