import { HBMaster } from './HBMaster';
import { HBPeer } from './HBPeer';
import { HBMasterConfig, HBPeerConfig, HBMode, DMRData } from './HBUtils';
import { DMRFrame } from './DMRFrame';

import { Logger,  createLogger, format, transports } from "winston";


/**
 * Configure logging
 */
const logConfig = {
        level: 'info',
        format: format.combine(format.timestamp(), format.json()),
        defaultMeta: { service: 'HBMaster' },
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

const masterConfig: HBMasterConfig = {
        port: 62031, 
        password:'passw0rd', 
        address:"0.0.0.0",
        pingInterval: 5000,
        MAX_PINGS: 5
        };


const master:HBMaster = new HBMaster(masterConfig, logConfig);

console.log("Master started");