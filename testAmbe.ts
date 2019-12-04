import { HBMaster } from './HBMaster';
import { HBPeer } from './HBPeer';
import { HBMasterConfig, HBPeerConfig, HBMode, DMRData, DMRFrameType } from './HBUtils';
import { DMRFrame } from './DMRFrame';
import fs, { WriteStream, ReadStream } from 'fs';
import { Logger,  createLogger, format, transports } from "winston";
import * as dgram from 'dgram';
import { CBPTC19696 } from './CBPTC19696';
import { DMRUtils } from './DMRUtils';
import { BitArray } from './BitArray';

/**
 * A sample peer program to send dmr frames to a ambe server
 * 
 * The files can be created with the dumper application
 */


  /**
   * Main injector class
   */
class SendAmbe {

    fileName:string;
    buffers: Array<Buffer>;
    sendBuffer:Buffer;

    counter:number = 0;
    sendInterval: any;
    transport: dgram.Socket;

    serverPort = 2470;
    serverAddress = '87.98.228.225';
    ws: WriteStream;

    decoder: CBPTC19696 = new CBPTC19696();
    dmrutils: DMRUtils = new DMRUtils();

    constructor(fileName: string) {
        this.fileName=fileName;
        this.buffers = new Array<Buffer>();
        this.sendBuffer = Buffer.alloc(320);

        this.readFile();

        this.ws = fs.createWriteStream("pcm.raw", {flags:'a'});

        this.transport = dgram.createSocket('udp4');

        this.transport.on('message', (msg, rinfo) => this.onMessage(msg, rinfo));
        this.transport.on('error', (error) => this.onError(error));
        this.transport.on('listening', () => {this.onListening()});

        this.transport.bind(this.serverPort);
    }

    onListening() {
        console.log("listentning");
    }

    onError(error:any) {
        console.log(error);
    }

    onMessage(packet:Buffer , rinfo:any) {
        console.log("<" + packet.toString('hex'));
        this.ws.write(packet);
    }
    
    sendToServer(packet:Buffer) {
        console.log(">"+packet.toString('hex'));
        this.transport.send(packet, this.serverPort, this.serverAddress);
    }

    send() {
        if (this.counter<this.buffers.length-1) {
            //this.peer.sendMaster(this.buffers[this.counter++]);
            let frame: DMRFrame = DMRFrame.fromBuffer(this.buffers[this.counter++]);
            
            if (frame.dmrData.frameType == DMRFrameType.VOICE) {
                //let data: Buffer = this.decoder.decode(Buffer.from(frame.dmrData.data, 'hex'));
                
                //console.log("DATA:" + data.toString('hex'));
                //let b:Buffer = Buffer.from(frame.dmrData.data);
                let b:Buffer = frame.extractVoiceData(frame.dmrData.data);
                console.log(">>>"+frame.dmrData.data.toString(('hex')));
                console.log(">>"+b.toString('hex'));


                this.sendToServer(this.toAmbe49(b.subarray(0, 9)));
                this.sendToServer(this.toAmbe49(b.subarray(9, 18)));
                this.sendToServer(this.toAmbe49(b.subarray(18, 27)));

            }

        } else {
            console.log("File sent");
            clearInterval(this.sendInterval);
        }
    }
        
    toAmbe49(buffer:Buffer):Buffer {
        let ambe49 = this.dmrutils.convert72BitTo49BitAMBE(BitArray.fromBuffer(buffer));
        return ambe49.getBuffer();
    }

    readFile() {
        let lineReader = require('readline').createInterface({
            input: fs.createReadStream(filename),
            crlfDelay: Infinity
        });
    
        lineReader.on('error', (err:any) => {
            console.log(err);
        });
    
        lineReader.on('line', async (line:any) => {
            //console.log(line);
            if (line.startsWith("444d5244")) {
    
                let frame: DMRFrame = DMRFrame.fromBuffer(Buffer.from(line, 'hex'));
                
                let src= frame.dmrData.source;
                let dst = frame.dmrData.destination;
                
                //frame.setSource(dst);
                //frame.setDestination(src);

                this.buffers.push(frame.buffer);
            }
        });
    
        lineReader.on('close', () => {
                console.log("File closed");
                
                this.sendInterval = setInterval( () => this.send(), 10);
        });
        
        
    }
}



//main

/*
if (process.argv[2] == undefined) {
    console.log("Please supply a file name argument")
    process.exit();
}

let filename: string = process.argv[2];
*/

let filename ="2019_10_18_21_56_22_2143827-21463-2817141022.dmr";

if (!fs.existsSync(filename)) {
    console.log("File not found " + filename);
    process.exit();
}

let testAmbe = new SendAmbe(filename);

/*
let frame: DMRFrame = new DMRFrame();
let b: Buffer = frame.extractVoiceData(Buffer.from("e5a8c54557061dec0af5aac56151100000000e204069c86ec59bc72172117d8c0a", "hex"));

console.log(">" + b.toString('hex'));
*/

console.log("SendAmbe started");