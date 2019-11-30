
/*
 * Homebrew protocol common utilities and data type enumerations
 * By David Temes, EA3IHI
 */

export enum HBStatus {
    idle,
    connected,
    closed,
    listening,
    RPTKSent,
    RPTCSent,
    RPTOSent,
    RPTLSent,
  }

export enum HBMode {
    master,
    peer
}

export interface HBMasterConfig {
    address: string;
    port: number;
    password: string;
    
    MAX_PINGS: number; //After this number of misssed pings peer will be disconnected
    pingInterval: number; //Ping interval in ms
   
}

export interface HBPeerConfig {
    id: number; //our id
    address: string;
    port: number;
    masterAddress: string;
    masterPort: number;
    masterPassword: string;
    masterId: number; //the id of the master we are connecting to

    MAX_PINGS: number; //After this number of misssed pings peer will be disconnected
    pingInterval: number; //Ping interval in ms
    
    //for config packet
    callSign: string;
    rxFreq: string;
    txFreq: string;
    txPower: string;
    colorCode: string;
    latitude: string;
    longitude: string;
    height: string;
    location: string;
    description: string;
    slots: string;
    url: string;
    softwareId: string;
    packageId: string;
    
}

export enum DMRCallType {
    GROUP_CALL,
    PRIVATE_CALL
}

export enum DMRFrameType {
    VOICE,
    VOICE_SYNC,
    DATA_SYNC,
    UNUSED
}

export enum DMRDataType {
    PRIVACY_INDICATOR,
    VOICE_HEADER,
    VOICE_TERMINATOR,
    CSBK,
    MULTIBLOCK,
    MULTIBLOCK1,
    DATA,
    RATE12DATA,
    RATE34DATA,
    IDLE,
    BURST_A,
    BURST_B,
    BURST_C,
    BURST_D,
    BURST_E,
    BURST_F
}

export interface DMRData {
    signature: string;
    seq: number;
    source: number;
    destination: number;
    repeaterId: number;
    slot: number;
    callType: DMRCallType;
    frameType: DMRFrameType;
    dataType: DMRDataType
    voiceSeq: number;
    streamId: number
    data: Buffer;

}

export interface DMRDCallback {
    (packet: Buffer) : void;
}

export interface DMRDEventCallback {
    (data: string) : void;
}


export interface DMRStream {
    id: number;
    source: number;
    destination: number;
    repeater: number;
    slot: number;
    start: number;
    stop: number;
}


export class HBUtils {

    public static numberToHexString(length: number, number: number) :string {
        let s: string = number.toString(16);
        return s.padStart(length, "0");
      }
  
    public static getRandomInt(min: any, max: any) : number {
        return Math.floor(Math.random() * (max - min)) + min;
      }

    public static toBytesInt32 (num: any) {
        let arr = new ArrayBuffer(4); // an Int32 takes 4 bytes
        let view = new DataView(arr);
        view.setUint32(0, num, false); // byteOffset = 0; litteEndian = false
        return arr;
    }
    
    public static createDMRFrame(source: number, dest: number) : Buffer {
        return Buffer.alloc(53);
    }
}



