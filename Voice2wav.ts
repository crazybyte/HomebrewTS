
import { DMRFrame } from './DMRFrame';
import fs, { WriteStream, ReadStream } from 'fs';
import { Logger,  createLogger, format, transports } from "winston";
import * as dgram from 'dgram';
import { CBPTC19696 } from './CBPTC19696';
import { DMRUtils } from './DMRUtils';
import { BitArray } from './BitArray';
import { DMRFrameType, DMRDataType } from './HBUtils';
import  Queue  from 'bull';
import { Sox } from './Sox';

/**
 * Class to get audio frames and create a wav file
 * it takes the dmr frame from a redis queue, extract the 3*9 bytes audio frames
 * converts them to 3x7 frames Ambe, sends them to Ambe server
 * And receives the 3x 320 bytes pcm audio data.
 * The PCM audio is saved to a raw file and converted to wav using Sox.
 */
  
export class Voice2Wav {

    queue: Queue.Queue;
        
    //Ambe server
    serverPort = 2470;
    serverAddress = '172.17.0.12';
    
    decoder: CBPTC19696 = new CBPTC19696();
    dmrutils: DMRUtils = new DMRUtils();

    transport: dgram.Socket;
    
    currentStream: number;
    fileName: string = ""; //file where we save the raw data
    writeStream: any;
    rawFilePrefix: string = "raw/";
    outFilePrefix: string = "ogg/";

    queueName: string = "";
    
    constructor(queueName:string, ambePort: number) {
        
        console.log ("Voice2wav processing queue " + queueName);
        this.currentStream = 0;
        this.queueName = queueName;
        this.serverPort = ambePort;

        this.queue = new Queue(queueName, {redis: {port: 6379, host: '127.0.0.1'}});
        
        this.transport = dgram.createSocket('udp4');

        this.transport.on('message', (msg, rinfo) => this.onMessage(msg, rinfo));
        this.transport.on('error', (error) => this.onError(error));
        this.transport.on('listening', () => {this.onListening()});

        this.transport.bind(this.serverPort);
        
        this.queue.process( (job) => {
            this.processDmrFrame(Buffer.from(job.data.message, 'hex'));
            job.remove();
          });
    }
    
    onListening() {
        console.log("listentning on " + this.serverPort);
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
        this.writeStream.write(pcmPacket);
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
    processDmrFrame(buffer:Buffer) {
       //console.log("Processing frame");
       let frame: DMRFrame = DMRFrame.fromBuffer(buffer);
       
       let isFinalFrame: boolean = false;

        if (frame.dmrData.frameType == DMRFrameType.DATA_SYNC && frame.dmrData.dataType == DMRDataType.VOICE_TERMINATOR) {
            isFinalFrame = true;
        }

        if (isFinalFrame) {
            this.closeRawFileStream();
        }

        if (frame.dmrData.streamId != this.currentStream) {
        
            if (this.currentStream != 0 && this.writeStream != undefined) {
                this.closeRawFileStream();
            }
            this.currentStream = frame.dmrData.streamId;

            let date = new Date();
            let dateformat = date.getUTCFullYear() + "_" + date.getUTCMonth() + "_" + 
            date.getUTCDate() + "_" + date.getUTCHours() + "_"+ date.getUTCMinutes() + "_" + 
            date.getUTCSeconds();

            this.fileName = dateformat + "_" + frame.dmrData.source + "-" + frame.dmrData.destination + "-" + frame.dmrData.streamId+".raw"
            console.log("Starting new stream " + this.fileName);

            this.writeStream = fs.createWriteStream(this.rawFilePrefix + this.fileName, {flags:'a'});
       }

       if (frame.dmrData.frameType == DMRFrameType.VOICE) {
                let b:Buffer = frame.extractVoiceData(frame.dmrData.data);

                // Extract the 3 x 9 bytes Ambe data, convert to Ambe49 and send
                this.sendToServer(this.toAmbe49(b.subarray(0, 9)));
                this.sendToServer(this.toAmbe49(b.subarray(9, 18)));
                this.sendToServer(this.toAmbe49(b.subarray(18, 27)));
       }
    }
    
    /**
     * Close the current file stream 
     */
    closeRawFileStream() {

        this.writeStream.close();

        //process file with sox to create a wav file
        console.log("Created file " + this.fileName);

        //transcode raw pcm to wav

        let fileOut: string = this.outFilePrefix + this.fileName.replace(".raw", '.ogg');
        Sox.transcode(this.rawFilePrefix + this.fileName, fileOut, '-r 8000 -e signed-integer -L -b 16 -c 1 -v 5'.split(' '), (code: number) => {
            console.log("Result: " + code);
        });
    }

    toAmbe49(buffer:Buffer):Buffer {
        let ambe49 = this.dmrutils.convert72BitTo49BitAMBE(BitArray.fromBuffer(buffer));
        return ambe49.getBuffer();
    }
}

new Voice2Wav("TG21463", 2474);
