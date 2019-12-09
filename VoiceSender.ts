
import { DMRFrame } from './DMRFrame';
import fs, { WriteStream, ReadStream } from 'fs';
import { Logger,  createLogger, format, transports } from "winston";
import * as dgram from 'dgram';
import { CBPTC19696 } from './CBPTC19696';
import { DMRUtils } from './DMRUtils';
import { BitArray } from './BitArray';
import { DMRFrameType } from './HBUtils';
import RSMQWorker  from "rsmq-worker";
import RedisSMQ from 'rsmq';

/**
 * Class to send audio frames to a ambe server
 * it takes the dmr frame from a redis queue, extract the 3*9 bytes audio frames
 * converts them to 3x7 frames Ambe, sends them to Ambe server
 * And receives the 320 bytes pcm audio data.
 * The PCM audio is queued and sent via UDP to other processes (gstreamer is a good option)
 */
  
export class VoiceSender {

    //transport to handle Ambe data
    transport: dgram.Socket;

    queue:RedisSMQ = new RedisSMQ({host: "127.0.0.1", port: 6379, ns: "TG"});
    queueWorker: any; //queue from which we obtain dmr frames
    
    //Ambe server
    serverPort = 2470;
    serverAddress = '172.17.0.12';
    
    decoder: CBPTC19696 = new CBPTC19696();
    dmrutils: DMRUtils = new DMRUtils();

    //Server where we send the PCM data via udp
    transportStream: dgram.Socket;
    streamAdrress: string = '127.0.0.1';
    streamPort: number = 22122;

    audioBuffers: Array<Buffer> = new Array<Buffer>();
    sendInterval: any;
    sendActive: boolean = false;
    MIN_BUF_SIZE: number = 30;
    
    constructor() {
        
        this.transport = dgram.createSocket('udp4');

        this.transport.on('message', (msg, rinfo) => this.onMessage(msg, rinfo));
        this.transport.on('error', (error) => this.onError(error));
        this.transport.on('listening', () => {this.onListening()});

        this.transport.bind(this.serverPort);

        this.transportStream = dgram.createSocket('udp4');

        this.sendInterval = setInterval( () => {this.sendBuffer()}, 19);

        this.queueWorker = new RSMQWorker("TG214", {rsmq: this.queue});

        this.queueWorker.onMessage(( msg: string, next: () => void, id: any ) =>{
                //console.log("Message id : " + id);
                this.receiveQueueMessage(msg, next, id);
            });
    }

    receiveQueueMessage (msg: string, next: () => void, id: any) {
        this.sendDmrFrame(Buffer.from(msg, 'hex'));
        next();
    }

    onListening() {
        console.log("listentning");
    }

    onError(error:any) {
        console.log(error);
    }

    /**
     * Reception of PCM from the Ambe server
     * @param packet 
     * @param rinfo 
     */
    onMessage(pcmPacket:Buffer , rinfo:any) {
        //console.log("<" + packet.toString('hex'));
        this.audioBuffers.push(pcmPacket);
    }
    
    /**
     * Sends PCM frames from the buffer to the receiver (gstreamer?)
     */
    sendBuffer() {

        if (this.audioBuffers.length > this.MIN_BUF_SIZE) {
            this.sendActive = true;
        }

        if ( this.sendActive == true ) {
            
            if (this.audioBuffers.length > 0) {
                //console.log("B:"+ this.audioBuffers.length);
                let b: Buffer | undefined = this.audioBuffers.shift();
                if (b != undefined) {
                    this.streamAudio(b);
                } 
            } else  {
                this.sendActive = false;
                console.log("Buffer empty");
            }
        }
    }

    streamAudio(packet:Buffer) {
        this.transportStream.send(packet, this.streamPort, this.streamAdrress);
    }

    /**
     * Send 7 bytes frames to the Ambe server
     * @param packet Send 
     */
    sendToServer(packet:Buffer) {
        //console.log(">"+packet.toString('hex'));
        this.transport.send(packet, this.serverPort, this.serverAddress);
    }

    /**
     * Send dmr frame to Ambe server
     * @param buffer 
     */
    sendDmrFrame(buffer:Buffer) {
       let frame: DMRFrame = DMRFrame.fromBuffer(buffer);
            
       if (frame.dmrData.frameType == DMRFrameType.VOICE) {
                let b:Buffer = frame.extractVoiceData(frame.dmrData.data);

                // Extract the 3 x 9 bytes Ambe data, convert to Ambe49 and send
                this.sendToServer(this.toAmbe49(b.subarray(0, 9)));
                this.sendToServer(this.toAmbe49(b.subarray(9, 18)));
                this.sendToServer(this.toAmbe49(b.subarray(18, 27)));
       }
    }
        
    toAmbe49(buffer:Buffer):Buffer {
        let ambe49 = this.dmrutils.convert72BitTo49BitAMBE(BitArray.fromBuffer(buffer));
        return ambe49.getBuffer();
    }
}
