import { HBPeer } from "./HBPeer";
import { format, transports, createLogger, Logger } from "winston";
import { HBPeerConfig, HBStatus, DMRFrameType, DMRDataType, HBMasterConfig } from "./HBUtils";
import { DMRFrame } from "./DMRFrame";
import { HBMonitor } from "./HBMonitor";
import { HBMaster } from "./HBMaster";
import { HBPeerData } from "./HBPeerData";
import { AddressInfo } from 'net';


/**
 * A simple bridge that will connect to two masters
 * and send dmrd frames to each other
 */

const masterConfig: HBMasterConfig = {
    port: 62031, 
    password:'passw0rd', 
    address:"0.0.0.0",
    pingInterval: 5000,
    MAX_PINGS: 5
    };
    
 
const peerConfig2: HBPeerConfig = {
    port: 50126, 
    address:"0.0.0.0",
    pingInterval: 5000,
    MAX_PINGS: 5,
    
    id:214381406,
    masterPort: 62031,
    
    masterAddress: "84.232.5.113",

    masterPassword: "passw0rd",
    masterId: 2141,

    callSign: "ea3ihi",
    rxFreq: "449000000",
    txFreq: "444000000",
    txPower: "01",
    colorCode: "01",
    latitude: "41.4016",
    longitude: "-2.1830",
    height: "75",
    location: "The Internet",
    description: "typescript repeater",
    slots: "4",
    url: "github.com/ea3ihi/HomebrewTS",
    softwareId: "20191126",
    packageId: "MMDVM_HBTS",
    };

/**
 * Configure logging
 */
const logConfig = {
    level: 'info',
    format: format.combine(format.timestamp(), format.json()),
    defaultMeta: { service: 'BridgeMaster' },
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


class Bridge {

    peer2: HBPeer;
    peer2Data : HBPeerData;

    logger: Logger;
    master: HBMaster;

    monitor: HBMonitor = new HBMonitor();

    constructor () {
        //master
        this.master = new HBMaster(masterConfig, logConfig);

        //peer that links to the other master
        this.peer2 = new HBPeer(peerConfig2, logConfig);
        this.peer2Data = new HBPeerData(peerConfig2.id, {address:'', family:'', port:0});
        

        this.peer2.onDmr( (data) => this.onDMR2(data));


        this.master.onDmr( (data) => this.onMasterDMR(data));

        this.logger = createLogger(logConfig);

        this.monitor.addPeer(this.peer2);
        this.monitor.addMaster(this.master);
        
        //setInterval( () => this.printStatistics(), 60000);
    }

   onDMR2(data: Buffer): void {
        
        const frame: DMRFrame = DMRFrame.fromBuffer(data);
        if (frame.dmrData.frameType == DMRFrameType.DATA_SYNC && frame.dmrData.dataType == DMRDataType.VOICE_HEADER) {
            this.logger.info(`Peer2 to local master: ${frame.dmrData.source} Destination: ${frame.dmrData.destination}`);
        }

        this.master.sendToAll(this.peer2Data, data);
    }

    onMasterDMR(data: Buffer): void {
        
        const frame: DMRFrame = DMRFrame.fromBuffer(data);
        if (frame.dmrData.frameType == DMRFrameType.DATA_SYNC && frame.dmrData.dataType == DMRDataType.VOICE_HEADER) {
            this.logger.info(`Master to peer2: ${frame.dmrData.source} Destination: ${frame.dmrData.destination}`);
        }

        this.peer2.sendMaster(data);
    }


    /**
     * Print some stream statistics
     */
    printStatistics() {
        this.logger.info(JSON.stringify(this.peer2.getStreams()));
    }
}


//main

let bridge = new Bridge();
