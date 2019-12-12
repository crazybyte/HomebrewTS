import { HBPeer } from "./HBPeer";
import { format, transports, createLogger, Logger } from "winston";
import { HBPeerConfig, DMRFrameType, DMRDataType, HBMasterConfig } from "./HBUtils";
import { DMRFrame } from "./DMRFrame";
import { HBMonitor } from "./HBMonitor";
import { HBMaster } from "./HBMaster";
import { HBPeerData } from "./HBPeerData";
import { DMRQueue } from "./DMRqueue";

/**
 * A simple bridge that consist of a master and a peer
 * and will send dmrd frames to each other
 */

const masterConfig: HBMasterConfig = require('./masterConfig.json');
   
 
const peerConfig2: HBPeerConfig = require('./bridgeConfig.json');

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

    dmrQueue: DMRQueue = new DMRQueue();

    constructor () {
        //Local master
        this.master = new HBMaster(masterConfig, logConfig);

        //peer that links to the Brandmeister master
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

        //send voice (only tg 214 and 214012)
        if (frame.dmrData.destination == 214 || frame.dmrData.destination == 214012) {
            this.dmrQueue.send(data);
        }
    }

    onMasterDMR(data: Buffer): void {
        const frame: DMRFrame = DMRFrame.fromBuffer(data);
        if (frame.dmrData.frameType == DMRFrameType.DATA_SYNC && frame.dmrData.dataType == DMRDataType.VOICE_HEADER) {
            this.logger.info(`Master to peer2: ${frame.dmrData.source} Destination: ${frame.dmrData.destination}`);
        }

        this.peer2.sendMaster(data);

        //send voice (only tg 214 and 214012)
        if (frame.dmrData.destination == 214 || frame.dmrData.destination == 214012) {
            this.dmrQueue.send(data);
        }
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
