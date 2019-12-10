
import { DMRFrame } from './DMRFrame';
import { DMRUtils } from './DMRUtils';
import Queue from 'bull';


/**
 * Class to send dmr frames to to a queue for further processing
 *   
 */
 
export class DMRQueue {
    
    dmrutils: DMRUtils = new DMRUtils();
    queue: Queue.Queue;
    queues: Set<string> = new Set<string>() // List of available already created queue
    
    constructor() {
        this.queue = new Queue('TG214', {redis: {port: 6379, host: '127.0.0.1'}});
    }
    
    /**
     * Send complete DMR frame to the queue
     */
    send(data: Buffer) {

        let dmrFrame: DMRFrame = DMRFrame.fromBuffer(data);
        
        const qdata = { message: data.toString('hex')}
        
        this.queue.add(qdata);
    }

    hasQueue(qname:string){
        return this.queues.has(qname);
    }
    
}
