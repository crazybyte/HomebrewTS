import { HBMaster } from './HBMaster';
import { HBPeer } from './HBPeer';
import { HBMasterConfig, HBPeerConfig, HBMode, DMRData } from './HBUtils';
import { DMRFrame } from './DMRFrame';
import { Logger,  createLogger, format, transports } from "winston";

import fs from 'fs';
import { CBPTC19696 } from './CBPTC19696';


//TEST BPTC19696
let cbp: CBPTC19696 = new CBPTC19696();
//last 33 bytes of data

//let b:Buffer = cbp.decode(Buffer.from("04c210a613f04e685970b600c46d5d7f77fd757e332821707600bba10ec3fe0204", 'hex'));
let b:Buffer = cbp.decode(Buffer.from("b5af26057e394be6ecc7cf60563171b170c0574d11e8a600e6ba011d62c6cbe6a8", 'hex'));


console.log(b.toString('hex'));


/**
 * Configure logging
 */
const logConfig = {
    level: 'debug',
    format: format.json(),
    defaultMeta: { service: 'Test peer' },
    transports: [
      //
      // - Write to all logs with level `info` and below to `combined.log` 
      // - Write all logs error (and below) to `error.log`.
      //
      new transports.File({ filename: './log/error.log', level: 'error'}),
      new transports.File({ filename: './log/combined.log'}),
      //log to console
      new transports.Console({format: format.combine(
        format.colorize(),
        format.simple(),
        format.timestamp()
        ), level:'debug'})
    ]
  }


const peerConfig: HBPeerConfig = {
    port: 50123, 
    address:"0.0.0.0",
    pingInterval: 5000,
    MAX_PINGS: 5,
    
    id:214381403, //0CC73359
    masterPort: 62031,
    masterAddress: "84.232.5.113",

    //masterPort: 57000,
    //masterAddress: "ea5gvk.duckdns.org",

    masterPassword: "passw0rd",
    masterId: 2141,

    callSign: "ea3ihi",
    rxFreq: "449000000",
    txFreq: "444000000",
    txPower: "25",
    colorCode: "01",
    latitude: "38.0000",
    longitude: "-095.0000",
    height: "75",
    location: "The Internet",
    description: "A typescript based homebrew master/peer",
    slots: "4",
    url: "www.google.com",
    softwareId: "20191114",  //"20170620",
    packageId: "MMDVM_HBlink",
    };
/*
const peer:HBPeer = new HBPeer(peerConfig, logConfig);

peer.onDMRDEvent( (data) => {

    if (data == 'XXXCONNECTED') {
      peer.sendMaster(Buffer.from("444d52440020b6530053d70cc7335ba144b02b2c04c210a613f04e685970b600c46d5d7f77fd757e332821707600bba10ec3fe0204", 'hex'));
      peer.sendMaster(Buffer.from("444d52440020b6530053d70cc7335ba144b02b2c04c210a613f04e685970b600c46d5d7f77fd757e332821707600bba10ec3fe0204", 'hex'));
      
      peer.sendMaster(Buffer.from("444d5244ce20b6530053d70cc7335ba244b02b2c04ad107213404e105900b6a0c4ad5d7f77fd7579663c22487160b7e106c3e70237", 'hex'));
      peer.sendMaster(Buffer.from("444d5244ce20b6530053d70cc7335ba244b02b2c04ad107213404e105900b6a0c4ad5d7f77fd7579663c22487160b7e106c3e70237", 'hex'));
    }
});

console.log("test start");
*/