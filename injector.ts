import { HBMaster } from './HBMaster';
import { HBPeer } from './HBPeer';
import { HBMasterConfig, HBPeerConfig, HBMode, DMRData } from './HBUtils';
import { DMRFrame } from './DMRFrame';
import fs, { WriteStream, ReadStream } from 'fs';
import { Logger,  createLogger, format, transports } from "winston";


/**
 * A sample peer program to inject a dmr file into a master
 * 
 * The files can be created with the dumper application
 */


const peerConfig: HBPeerConfig = {
    port: 50124, 
    address:"0.0.0.0",
    pingInterval: 5000,
    MAX_PINGS: 5,
    
    id:214381405, //0CC73359
    masterPort: 62031,
    
    masterAddress: "127.0.0.1",
    //masterAddress: "84.232.5.113",

    //masterPort: 57000,
    //masterAddress: "ea5gvk.duckdns.org",

    masterPassword: "passw0rd",
    masterId: 2141381498,

    callSign: "ea3ihi",
    rxFreq: "449000000",
    txFreq: "444000000",
    txPower: "25",
    colorCode: "01",
    latitude: "38.0000",
    longitude: "-095.0000",
    height: "75",
    location: "The Internet",
    description: "A typescript based repeater",
    slots: "4",
    url: "www.google.com",
    softwareId: "20170620",
    packageId: "MMDVM_HBlink",
    };

    
 /**
 * Configure logging
 */
const logConfig = {
    level: 'info',
    format: format.json(),
    defaultMeta: { service: 'Injector' },
    transports: [
      //
      // - Write to all logs with level `info` and below to `combined.log` 
      // - Write all logs error (and below) to `error.log`.
      //
      new transports.File({ filename: './log/error.log', level: 'error' }),
      new transports.File({ filename: './log/combined.log' }),
      //log to console
      new transports.Console({format: format.combine(
        format.colorize(),
        format.simple()
        ), level:'info'})
    ]
  }

  /**
   * Main injector class
   */
class Injector {

    fileName:string;
    buffers: Array<Buffer>;
    peer: HBPeer;
    counter:number = 0;
    sendInterval: any;

    constructor(fileName: string) {
        this.fileName=fileName;
        this.buffers = new Array<Buffer>();

        this.readFile();

        //build peer;
        this.peer = new HBPeer(peerConfig, logConfig);

        this.peer.onDMRDEvent( (data:string) => { this.onDMREvent(data)} );
    }

    onDMREvent(data: string) {
        if (data == "CONNECTED") {
            console.log('Connected, sending data');
            this.sendInterval = setInterval( () => {this.send()}, 60);
        }
    }
        
    send() {
        if (this.counter<this.buffers.length-1) {
            this.peer.sendMaster(this.buffers[this.counter++]);
        } else {
            console.log("File sent");
            this.peer.close();
            clearInterval(this.sendInterval);
        }
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
    
        lineReader.on('close', function() {
                console.log("File closed");
        });
        
        
    }
}



//main


if (process.argv[2] == undefined) {
    console.log("Please supply a file name argument")
    process.exit();
}

let filename: string = process.argv[2];

if (!fs.existsSync(filename)) {
    console.log("File not found " + filename);
    process.exit();
}

let injector = new Injector(filename);

console.log("Injector started");