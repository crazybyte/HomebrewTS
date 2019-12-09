
import { DMRFrame } from './DMRFrame';
import { DMRUtils } from './DMRUtils';
import RedisSMQ = require( "rsmq");


/**
 * Class to send dmr frames to to a queue for further processing
 *   
 */
 
export class DMRQueue {
    
    dmrutils: DMRUtils = new DMRUtils();
    queue: RedisSMQ;
    queues: Set<string> = new Set<string>() // List of available already created queue
    
    constructor() {
        this.queue = new RedisSMQ({host: "127.0.0.1", port: 6379, ns: "tg"});
    }
    
    /**
     * Send complete DMR frame to the queue
     */
    send(data: Buffer) {

        let dmrFrame: DMRFrame = DMRFrame.fromBuffer(data);
        let qname = "TG"+dmrFrame.dmrData.destination.toString();
        
        if (this.hasQueue(qname)) {
            this.queue.sendMessage({ qname: qname, message: data.toString('hex')}, () => {});
        } else {
            this.queue.createQueue({ qname: qname }, (err:any) => {
                this.queue.sendMessage({ qname: qname, message: data.toString('hex')}, () => {});
                });
            this.queues.add(qname)
        }
        console.log("listentning");
    }

    hasQueue(qname:string){
        return this.queues.has(qname);
    }
    
}
