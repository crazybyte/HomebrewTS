import * as dgram from 'dgram';
import * as crypto from 'crypto';
import { AddressInfo } from 'net';
import { HBPeerData } from './HBPeerData';
import { HBStatus, HBMasterConfig, HBUtils, HBMode, HBPeerConfig }  from './HBUtils';

import { Logger,  createLogger, format, transports } from "winston";
import fs from 'fs';

/**
 * Homebrew protocol Master
 * By David Temes, EA3IHI
 */
export class HBMaster  {
  
    status: HBStatus = HBStatus.closed;

    transport: dgram.Socket;
    peers: Array<HBPeerData> = new Array<HBPeerData>();
    address!: AddressInfo;
    config: HBMasterConfig;

    //communications
    pingNumber: number = 0; //number of pings received
    pingMissed: number = 0; //number of missed pings
    
    //logging
    logger: Logger;

    constructor (config: HBMasterConfig, logConfig: object) {

      this.config = config;

      this.transport = dgram.createSocket('udp4');
    
      //set up logging
      this.logger = createLogger(logConfig);

      //bind to events
      this.transport.on('listening', () => {this.onListening()});
      this.transport.on('error', (error) => this.onError(error));
      this.transport.on('close', () => this.onClose());
      this.transport.on('message', (msg, rinfo) => this.onMasterMessage(msg, rinfo));

      // maintenance timer
      setInterval( () => { this.checkPeers()}, this.config.pingInterval);
      
      //bind to port and address
      this.transport.bind(this.config.port, this.config.address);
    }

    onListening() {
      this.address = <AddressInfo> this.transport.address();
      this.logger.info("Homebrew TS Master by EA3IHI");
      this.logger.info(`Master listening ${this.address.address}:${this.address.port}`);
      this.status = HBStatus.listening;
    }

    onClose() {
      this.logger.info('Master closed');
      this.status = HBStatus.closed;
    }

    onError(error:any) {
      this.logger.error(error);
    }
    
    sendMSTNACK(peer: HBPeerData) {
      const buffer:Buffer = Buffer.concat( [Buffer.from("MSTNACK") , Buffer.from(HBUtils.toBytesInt32(peer.id))]);
      this.logger.debug('>' + buffer.toString('hex'));
      this.logger.debug('Send MSTNACK');
      this.transport.send(buffer, peer.address.port, peer.address.address);
    }

    sendRPTACK(peer: HBPeerData) {
      const buffer:Buffer = Buffer.concat( [Buffer.from("RPTACK") , Buffer.from(HBUtils.toBytesInt32(peer.id))]);
      this.logger.debug('>' + buffer.toString('hex'));
      this.logger.debug('Send RPTACK');
      this.transport.send(buffer, peer.address.port, peer.address.address);
    }

    sendMSTPONG(peer: HBPeerData) {
      const buffer:Buffer = Buffer.concat( [Buffer.from("MSTPONG") , Buffer.from(HBUtils.toBytesInt32(peer.id))]);
      this.logger.debug('>' + buffer.toString('hex'));
      this.logger.debug('Send MSTPONG');
      this.transport.send(buffer, peer.address.port, peer.address.address);
    }

    /**
     * Send data to a peer
     * @param peer 
     * @param packet 
     */
    sendPeer(peer: HBPeerData, packet: Buffer) {
      let buffer:Buffer = Buffer.concat([packet.subarray(0,10), Buffer.from(HBUtils.toBytesInt32(peer.id)), packet.subarray(15)]);

      this.logger.debug('>' + buffer.toString('hex'));
      this.transport.send(buffer, peer.address.port, peer.address.address);
    }

    /**
     * Send packet to all peers except originating peer
     * @param peer 
     * @param packet 
     */
    sendToAll(peer: HBPeerData, packet: Buffer) {
      this.logger.debug('>' + packet.toString('hex'));
      let modifiedPacket:Buffer = Buffer.alloc(53);
      packet.copy(modifiedPacket);

      for (let sendpeer of this.peers) {
        if (sendpeer.id != peer.id) {
          modifiedPacket.writeUInt32BE(sendpeer.id, 11);
          this.transport.send(modifiedPacket, sendpeer.address.port, sendpeer.address.address);   
          this.logger.debug("Resending dmr packet to peer " + sendpeer.id);
          }
      }
    }
    
    /**
     * Called when the master receives a packet
     * @param packet 
     * @param rinfo 
     */
    onMasterMessage(packet:Buffer , rinfo:any) {
      this.logger.debug(`Master got: ${packet} from ${rinfo.address}:${rinfo.port}`);
      this.logger.debug('<' + packet.toString('hex'));
      
      const command:string = packet.subarray(0, 4).toString();

      if (command == "DMRD") {
        const peerId = packet.subarray(11, 15).readUInt32BE(0);

        const peer: undefined | HBPeerData = this.getPeer(peerId);
        this.logger.debug("DMR packet received from peer " + peerId);

        if (peer != undefined) {
          let nbuf: Buffer = Buffer.alloc(4);
          packet.subarray(5, 8).copy(nbuf,1);
          let origin: number = nbuf.readUInt32BE(0);
          packet.subarray(8, 11).copy(nbuf,1);
          let destination: number = nbuf.readUInt32BE(0);
          this.logger.debug(`Origin ${origin} -> ${destination}`);
          this.sendToAll(peer, packet);
        } else {
          this.logger.warn(`Peer ${peerId}  not found`);
        }
        
      } else if (command == "RPTL")  {//login request
        const peerId = packet.subarray(4, 8).readUInt32BE(0);
        const peer: undefined | HBPeerData = this.getPeer(peerId);
        if (peer == undefined || peer.status == HBStatus.closed) {
          const npeer:HBPeerData = new HBPeerData(peerId, rinfo);
          npeer.status = HBStatus.RPTLSent;
          
          let salt = HBUtils.toBytesInt32(npeer.salt);

          const response:Buffer = Buffer.concat( [Buffer.from("RPTACK"), Buffer.from(salt)] );

          this.peers.push(npeer);
          this.sendPeer(npeer, response);
        } else {

          if (peer.status == HBStatus.RPTLSent) {
            let salt = HBUtils.toBytesInt32(peer.salt);
            const response:Buffer = Buffer.concat( [Buffer.from("RPTACK"), Buffer.from(salt)] );
            this.sendPeer(peer, response);
          } else {
            this.sendMSTNACK(peer);
            this.deletePeer(peer);
          }
        }
      } else if (command == "RPTK") { //login response to challenge
        const peerId = packet.subarray(4, 8).readUInt32BE(0);
        const peer: undefined | HBPeerData = this.getPeer(peerId);
       
        if (peer != undefined) {
          const hash = packet.subarray(8).toString('hex');

          const hashBuffer:Buffer = Buffer.concat([Buffer.from(HBUtils.toBytesInt32(peer.salt))
                , Buffer.from(this.config.password)]);
          
          const calculatedHash = crypto.createHash('sha256')
                .update(hashBuffer).digest('hex');

          if (hash == calculatedHash) {
            peer.status = HBStatus.connected;
            this.sendRPTACK(peer);
            console.log("Peer authenticated " + peer.id);
          } else {
            //Send MSTNACK and delete peer
            this.sendMSTNACK(peer);
            this.deletePeer(peer);
          }
        }
      } else if (command == "RPTC") { //config or disconnect
        if (packet.subarray(4,5).toString() == 'L') { //disconnect
          const peerId = packet.subarray(5, 9).readUInt32BE(0);
          const peer: undefined | HBPeerData = this.getPeer(peerId);
          if (peer != undefined) {
            this.logger.info("Peer disconnecting " + peer.id );
            this.deletePeer(peer);
          }
        } else  { //configuration received
          const peerId = packet.subarray(4, 8).readUInt32BE(0);
          const peer: undefined | HBPeerData = this.getPeer(peerId);
          if (peer != undefined) {
            peer.callSign = packet.subarray(8,16).toString().trim();
            peer.rxFreq = packet.subarray(16,25).toString().trim();
            peer.txFreq =  packet.subarray(25,34).toString().trim();
            peer.txPower = packet.subarray(34,36).toString().trim();
            peer.colorCode = packet.subarray(36,38).toString().trim();
            peer.latitude = packet.subarray(38,46).toString().trim();
            peer.longitude = packet.subarray(46,55).toString().trim();
            peer.height = packet.subarray(55,58).toString().trim();
            peer.location = packet.subarray(58,78).toString().trim();
            peer.description = packet.subarray(78,97).toString().trim();
            peer.slots = packet.subarray(97,98).toString().trim();
            peer.url = packet.subarray(98,222).toString().trim();
            peer.softwareId = packet.subarray(222,262).toString().trim();
            peer.packageId = packet.subarray(262,302).toString().trim();
          
            this.sendRPTACK(peer);
            this.logger.info("Peer configuration " + JSON.stringify(peer));
          }
        }
      } else if (command == "RPTP") {//RPTPING
        const peerId = packet.subarray(7, 11).readUInt32BE(0);
        const peer: undefined | HBPeerData = this.getPeer(peerId);
        if (peer != undefined) {
          peer.lastPing = new Date();
          peer.pingNumber++;
          peer.pingMissed = 0;
          this.sendMSTPONG(peer);
        } else { //ping from unknown peer
          this.transport.send(Buffer.concat(
              [Buffer.from("MSTNAK"), Buffer.from(HBUtils.toBytesInt32(peerId))]),
              rinfo.port, rinfo.address);
        }
      
      }
    }


  /**
   * Check if peers are alive based in number of missed pings
   */
  checkPeers() {
    for (let peer of this.peers) {
      peer.pingMissed++;

      if (peer.pingMissed > this.config.MAX_PINGS) {
        this.logger.info("Peer " + peer.id + " reached maximun missed pings, removing ");
        this.deletePeer(peer);
      }

    }
  }

  /**
   * 
   * @param peer Remove peer from list of peers
   */  
  deletePeer(peer: HBPeerData) {
    this.logger.info("Removing peer " +peer.id);
    const index = this.peers.indexOf(peer, 0);
    if (index > -1) {
      this.peers.splice(index, 1);
    }
  }

  /**
   * Return a peer from the peers arry if peer id matches
   * @param peerId 
   */
  getPeer(peerId: number): HBPeerData | undefined {
    for (let peer of this.peers) {
        if (peer.id == peerId) {
          return peer;
        }
    }
    return undefined;
  }

  /**
   * Get list of peers
   */
  getPeers() :Array<HBPeerData> {
    return this.peers;
  }
       
    
}