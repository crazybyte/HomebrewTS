import { HBMaster } from './HBMaster';
import { HBPeer } from './HBPeer';
import { HBMasterConfig, HBPeerConfig, HBMode, DMRData, DMRFrameType, DMRDataType } from './HBUtils';
import { DMRFrame } from './DMRFrame';
import fs, { WriteStream } from 'fs';
import { Logger,  createLogger, format, transports } from "winston";


/**
 * A sample program to record all streams to .dmr files
 * The files consist in a json description of each frame
 * followed by the hex dump of the dmrd frame in the next line
 * 
 * The file name contains the date, source and destionation, with the extension .dmr
 */


/**
 * Configure logging
 */
const logConfig = {
    level: 'info',
    format: format.combine(format.timestamp(), format.json()),
    defaultMeta: { service: 'Dumper' },
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
        format.simple(),
        format.timestamp()
        ), level:'info'})
    ]
  }


const peerConfig: HBPeerConfig = {
    port: 50123, 
    address:"0.0.0.0",
    pingInterval: 5000,
    MAX_PINGS: 5,
    
    id:214381403, //0CC73359
    masterPort: 62031,
    masterAddress: "127.0.0.1",

    //masterPort: 57000,
    //masterAddress: "ea5gvk.duckdns.org",

    masterPassword: "passw0rd",
    masterId: 214381498,

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
    slots: "1",
    url: "www.google.com",
    softwareId: "20170620",
    packageId: "MMDVM_HBlink",
    };

const peer:HBPeer = new HBPeer(peerConfig, logConfig);

let streamFilenameMap = new Map();

peer.onDmr( (packet:Buffer) => {
    let data: DMRData = DMRFrame.parseRawPacket(packet);
    //console.log(JSON.stringify(data));
    //console.log(packet.toString('hex'));

    let ws:WriteStream;
    let isFinalFrame: boolean = false;

    if (data.frameType == DMRFrameType.DATA_SYNC && data.dataType== DMRDataType.VOICE_TERMINATOR) {
        isFinalFrame = true;
    }

    //new stream?
    if (!streamFilenameMap.has(data.streamId)) {
        if (isFinalFrame) {
            return;
        }

        //build filename to save stream
        let date = new Date();
        let dateformat = date.getUTCFullYear() + "_" + date.getUTCMonth() + "_" + 
            date.getUTCDate() + "_" + date.getUTCHours() + "_"+ date.getUTCMinutes() + "_" + 
            date.getUTCSeconds();

        const filename:string = dateformat + "_" + data.source + "-" + data.destination + "-" + data.streamId+".dmr"
        ws = fs.createWriteStream(filename, {flags:'a'});
        streamFilenameMap.set(data.streamId, ws);
        console.log("Writing file " + filename);
    } else {
        ws = streamFilenameMap.get(data.streamId);
    }
    
    try {
        ws.write(JSON.stringify(data)+"\r\n"+packet.toString('hex')+"\r\n");    
    } catch (e) {
        console.log(e);
    }

    if (isFinalFrame) {
        setTimeout( () => {
            console.log("Closing file for stream " +data.streamId);
            streamFilenameMap.delete(data.streamId);
            ws.close();
        }, 1000);
    }
});

console.log("Dumper by EA3IHI started");