import * as dgram from 'dgram';
import * as crypto from 'crypto';
import { AddressInfo } from 'net';
import { HBPeerData } from './HBPeerData';
import { HBStatus, HBUtils, HBMode, HBPeerConfig, DMRDCallback, DMRDEventCallback, DMRStream, DMRFrameType, DMRDataType }  from './HBUtils';
import { Logger,  createLogger, format, transports } from "winston";
import { DMRFrame } from './DMRFrame';

/**
 * Homebrew protocol Peer
 * By David Temes, EA3IHI
 */

export class HBPeer  {

    status: HBStatus = HBStatus.closed;

    transport: dgram.Socket;
    peers: HBPeerData[] = new Array<HBPeerData>();
    address!: AddressInfo;
    config: HBPeerConfig;
    pingMissed: number = 0;
    pingNumber: number = 0;

    tgs: Set<number> = new Set<number>();

    peerCheckInterval: NodeJS.Timeout;

    streamMap: Map<number,DMRStream> = new Map<number,DMRStream>();
        
    logger: Logger;

    MAX_STREAMS:number = 12;

    constructor (config: HBPeerConfig, logConfig: object) {

      this.config = config;

      this.logger = createLogger(logConfig);

      this.transport = dgram.createSocket('udp4');
    
      //bind to events
      this.transport.on('listening', () => {this.onListening()});

      this.transport.on('error', (error) => this.onError(error));

      this.transport.on('close', () => this.onClose());

      
      this.peerCheckInterval = setInterval( () => { this.peerLoop()}, this.config.pingInterval);
        this.transport.on('message', (msg, rinfo) => this.onPeerMessage(msg, rinfo));
      

      this.transport.bind(this.config.port);
    }

    private onListening() {
      this.address = <AddressInfo> this.transport.address();
      this.logger.info("Homebrew TS Peer by EA3IHI");
      this.logger.info(`Peer listening ${this.address.address}:${this.address.port}`);
      this.sendRPTL();
      this.status = HBStatus.RPTLSent;
    }

    private onClose() {
      this.logger.info(`Closed`);
      this.status = HBStatus.closed;
    }

    private onError(error:any) {
      this.logger.error(error);
    }
    
    //not used or does not work
    public sendTRMENT() {
      const buffer:Buffer = Buffer.concat( [Buffer.from("TRMENT") , 
        Buffer.from(this.config.id.toString(16)), //Buffer.from(HBUtils.toBytesInt32(this.config.id)),
        Buffer.from(":" + this.config.callSign + ":" +this.config.packageId + "-" + this.config.softwareId )
      ]);
    }

    //not used or does not work
    public sendTRMSUB(tg: number) {
      const buffer:Buffer = Buffer.concat( [Buffer.from("TRMSUB") , 
        Buffer.from(this.config.id.toString(16)), //Buffer.from(HBUtils.toBytesInt32(this.config.id)),
        Buffer.from(":TG"+tg)
      ]);

      this.logger.debug("Sending TRMSUB to TG"+tg);
      this.logger.debug('>' + buffer.toString('hex'));
      this.transport.send(buffer, this.config.masterPort, this.config.masterAddress);
    }

    /**
     * Used by a peer to send login request to a master
     * 
     */
    private sendRPTL() {
      const buffer:Buffer = Buffer.concat( [Buffer.from("RPTL") , Buffer.from(HBUtils.toBytesInt32(this.config.id))]);
      this.logger.info("Sending RPTL to master " + this.config.masterId);
      this.logger.debug('>' + buffer.toString('hex'));
      this.transport.send(buffer, this.config.masterPort, this.config.masterAddress);
    }


    /**
     * Used by a peer to inform that the connection is closing
     * 
     */
    private sendRPTCL() {
      const buffer:Buffer = Buffer.concat( [Buffer.from("RPTCL") , Buffer.from(HBUtils.toBytesInt32(this.config.id))]);
      this.logger.info("Sending RPTCL");
      this.logger.debug('>' + buffer.toString('hex'));
      this.transport.send(buffer, this.config.masterPort, this.config.masterAddress);
    }

    /**
     * Ping master
     */
    private sendRPTPING() {
      const buffer:Buffer = Buffer.concat( [Buffer.from("RPTPING") , Buffer.from(HBUtils.toBytesInt32(this.config.id))]);
      this.logger.debug("Sending RPTPING");
      this.logger.debug('>' + buffer.toString('hex'));
      this.transport.send(buffer, this.config.masterPort, this.config.masterAddress);
    }

    /**
     * Send configuration to master
     */
    private sendRPTC() {
      const buffer:Buffer = Buffer.concat( [
        Buffer.from("RPTC") , 
        Buffer.from(HBUtils.toBytesInt32(this.config.id)),
        Buffer.from(this.config.callSign.padEnd(8, " ").substring(0,8)),
        Buffer.from(this.config.rxFreq.padEnd(9, "0").substring(0,9)),
        Buffer.from(this.config.txFreq.padEnd(9, "0").substring(0,9)),
        Buffer.from(this.config.txPower.padStart(2, "0").substring(0,2)),
        Buffer.from(this.config.colorCode.padStart(2, "0").substring(0,2)),
        Buffer.from(this.config.latitude.padEnd(8, " ").substring(0,8)),
        Buffer.from(this.config.longitude.padEnd(9, " ").substring(0,9)),
        Buffer.from(this.config.height.padStart(3, "0").substring(0,3)),        
        Buffer.from(this.config.location.padEnd(20, " ").substring(0,20)),
        Buffer.from(this.config.description.padEnd(19, " ").substring(0,19)),
        Buffer.from(this.config.slots.padEnd(1, "0").substring(0,1)),
        Buffer.from(this.config.url.padEnd(124, " ").substring(0,124)),
        Buffer.from(this.config.softwareId.padEnd(40, " ").substring(0,40)),
        Buffer.from(this.config.packageId.padEnd(40, " ").substring(0,40)),
        ]);
      this.logger.debug("Sending RPTC");
      this.logger.debug('>' + buffer.toString('hex'));
      this.transport.send(buffer, this.config.masterPort, this.config.masterAddress);
    }

    /**
     * Send options to master
     */
    private sendRPTO() {
      //TODO: build options
      const buffer:Buffer = Buffer.concat( [Buffer.from("RPTO") , Buffer.from(HBUtils.toBytesInt32(this.config.id))]);
      this.logger.debug("Sending RPTO");
      this.logger.debug('>' + buffer.toString('hex'));
      this.transport.send(buffer, this.config.masterPort, this.config.masterAddress);
    }

    /**
     * Send the hashed key to the master
     * @param hash 
     */
    private sendRPTK(hash: Buffer) {
      const buffer:Buffer = Buffer.concat( [Buffer.from("RPTK") , 
        Buffer.from(HBUtils.toBytesInt32(this.config.id)),
       hash
        ]);
      this.logger.debug("Sending RPTK");
      this.logger.debug('>' + buffer.toString('hex'));
      this.transport.send(buffer, this.config.masterPort, this.config.masterAddress);
    }

    /**
     * Send data to the master this peer is connected to.
     * @param buffer
     */
    public sendMaster(packet:Buffer) {
      let command = packet.subarray(0,4).toString();

      let modifiedPacket:Buffer = Buffer.alloc(packet.length);
      packet.copy(modifiedPacket);

      if (command == "DMRD") {
        modifiedPacket.writeUInt32BE(this.config.id, 11);
      }
      this.logger.debug("Sending packet to master " + modifiedPacket.toString('hex'));
      this.transport.send(modifiedPacket, this.config.masterPort, this.config.masterAddress);   
    }

    /**
     * Peer loop
     */
    private peerLoop() {
      if (this.status == HBStatus.closed || this.status == HBStatus.listening) {
        this.sendRPTL();
        this.status = HBStatus.RPTLSent;
      } else if (this.status == HBStatus.RPTLSent) {
        this.pingMissed++;
        this.status = HBStatus.closed;
      } else if (this.status == HBStatus.connected) {
        this.sendRPTPING();
        this.pingMissed++;
        if (this.pingMissed > this.config.MAX_PINGS) {
          this.status = HBStatus.closed;
          this.logger.warn("Disconnected from master " + this.config.masterId);
        }
      }
    }
    
    /**
     * Called when the peer receives a message
     * @param packet
     * @param rinfo 
     */
    private onPeerMessage(packet:Buffer , rinfo:any) {
      this.logger.debug(`Peer got: ${packet} from ${rinfo.address}:${rinfo.port}`);
      this.logger.debug('<' + packet.toString('hex'));

      //check that frame comes from master?
      if (rinfo.port != this.config.masterPort || rinfo.address != this.config.masterAddress) {
        this.logger.warn(`Received packet from unknown source $(rinfo.address):$(rinfo.port)`);
        return;
      }

      const command:string = packet.subarray(0, 4).toString();

      if (command == "DMRD") {
        this.logger.debug("DMRD packet received");
        this.dispatchOnDMRD(packet);

        let frame:DMRFrame = DMRFrame.fromBuffer(packet);
        
        //this.logger.info(`src: ${frame.dmrData.source} dst: ${frame.dmrData.destination} - frmType ${frame.dmrData.frameType}`)
        
        if (frame.dmrData.frameType==DMRFrameType.DATA_SYNC) {
          if (frame.dmrData.dataType == DMRDataType.VOICE_HEADER) { 
            this.startFrame(frame);
            this.addTg(frame.dmrData.destination);
          } else  if (frame.dmrData.dataType == DMRDataType.VOICE_TERMINATOR) {
            this.endFrame(frame);
          }
        }

        
      } else if (command == "MSTN") { //MSTNACK from master
        this.logger.warn("Received MSNAK!");
        this.status = HBStatus.closed;
        this.dispatchOnDMRDEvent('MSTNACK');
      } else if (command == "RPTA") {//RPTACK from master
        switch (this.status) {
          case HBStatus.RPTLSent: //RPTL has been sent

              const salt = packet.readUInt32BE(6);
              
              const hashBuffer:Buffer = Buffer.concat([Buffer.from(HBUtils.toBytesInt32(salt))
                , Buffer.from(this.config.masterPassword)]);

              const calculatedHash = crypto.createHash('sha256')
                .update(hashBuffer).digest();
              
              this.sendRPTK(calculatedHash);
              this.status = HBStatus.RPTKSent;

            break;
          case HBStatus.RPTKSent:
            //our password hash has been accepted. send config  
            
            this.status=HBStatus.RPTCSent;
            this.sendRPTC();

            break;
          case HBStatus.RPTCSent:  
            //our config has been accepted. send options or done
            
            //this.status=HBStatus.RPTOSent;
            //this.sendRPTO();
            this.status=HBStatus.connected;
            this.logger.info("Connected to master " +  this.config.masterId);
            this.dispatchOnDMRDEvent("CONNECTED");
          
          case HBStatus.RPTOSent:  
            //our options have been accepted. we are connected
            this.status=HBStatus.connected;
            
        }

      } else if (command == "MSTP") { // MSTPONG from server
        this.pingMissed = 0;
        this.pingNumber++;

      } else if (command == "MSTC") { //Master close
        this.status = HBStatus.closed;
        this.logger.info("Received close from master");
        this.dispatchOnDMRDEvent('MSTCL');
      }
    }

    /**
     * Say goodbye to master and close the connection
     */
    public close() {
      this.sendRPTCL();
      clearInterval(this.peerCheckInterval);
      
      setTimeout( () => {
        this.status = HBStatus.closed;
        this.transport.close();
      },500);
    }

    /**
     * Get array of last streams processed
     */
    public getStreams(): Array<DMRStream> {
      return Array.from(this.streamMap.values()).reverse();
    }

    //new call
    private startFrame(frame:DMRFrame) {
      if (!this.streamMap.has(frame.dmrData.streamId)) {
        let stream: DMRStream = {
          id: frame.dmrData.streamId,
          source: frame.dmrData.source,
          destination: frame.dmrData.destination,
          repeater: frame.dmrData.repeaterId,
          start: Date.now(),
          stop: 0,
          slot: frame.dmrData.slot
        }
        this.streamMap.set(stream.id, stream);
      }

    }

    //terminating call
    private endFrame(frame:DMRFrame) {
      if (this.streamMap.has(frame.dmrData.streamId)) {
        let stream: DMRStream = <DMRStream> this.streamMap.get(frame.dmrData.streamId);
        stream.stop = Date.now();
      }
      if (this.streamMap.size > this.MAX_STREAMS) {
        this.streamMap.delete(this.streamMap.keys().next().value);
        }
    }

    
    /**
     * Events section
     */
     
    dmrCallbacks: DMRDCallback[] = [];

    public onDmr(callback: DMRDCallback) {
      this.dmrCallbacks.push(callback);
    }

    private dispatchOnDMRD (packet: Buffer){
      for (let callback of this.dmrCallbacks) {
        callback(packet);
      }

    }

    eventCallbacks: DMRDEventCallback[] = [];

    public onDMRDEvent(callback: DMRDEventCallback) {
      this.eventCallbacks.push(callback);
    }

    private dispatchOnDMRDEvent (data: string){
      for (let callback of this.eventCallbacks) {
        callback(data);
      }

    }

    /**
     * 
     * @param n Add tg to the list of tgs this peer is interested in
     */
    private addTg(n:number) {
      if (!this.tgs.has(n)){
        this.tgs.add(n);
      }

      if (n == 4000) {
        this.tgs.clear();
      }
    }

    public hasTg(n:number) {
      return this.tgs.has(n);
    }

    public removeTg(n:number) {
      return this.tgs.delete(n);
    }

}