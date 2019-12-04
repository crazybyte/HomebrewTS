import { DMRData, DMRCallType, DMRFrameType, DMRDataType } from "./HBUtils";

export class DMRFrame {
    
    buffer:Buffer;
    dmrData: DMRData;

    constructor() {
        this.buffer = Buffer.alloc(53);
        this.dmrData = {
            signature: "DMRD",
            seq: 0,
            source: 0,
            destination: 0,
            repeaterId: 0,
            slot: 0,
            callType: DMRCallType.GROUP_CALL,
            frameType: DMRFrameType.DATA_SYNC,
            dataType: DMRDataType.IDLE,
            voiceSeq: 0,
            streamId: 0,
            data: Buffer.alloc(0)
        };
    }

    public static fromBuffer (buffer:Buffer) : DMRFrame {
        const frame: DMRFrame = new DMRFrame();
        buffer.copy(frame.buffer);

        frame.dmrData= this.parseRawPacket(frame.buffer);
        return frame;
    }

    /**
     * Extract data from the drmd frame and populate the frameData estructure
     */
    public static parseRawPacket(buffer: Buffer) : DMRData {
        let data:DMRData = {
            signature: buffer.subarray(0,4).toString(),
            seq: buffer.readUInt8(4),
            source: buffer.readUInt32BE(4) & 0x00FFFFFF,
            destination: buffer.readUInt32BE(7) & 0x00FFFFFF,
            repeaterId: buffer.readUInt32BE(11),
            
            slot: (buffer.readUInt8(15) & 0x80) == 0x80 ? 1 : 0,
            callType: (buffer.readUInt8(15) & 0x40) == 0x40 ? DMRCallType.PRIVATE_CALL : DMRCallType.GROUP_CALL,
            frameType: (buffer.readUInt8(15) & 0x30) >>4,
            dataType: buffer.readUInt8(15) & 0x0F,
            voiceSeq: buffer.readUInt8(15) & 0x0F,
            
            streamId: buffer.readUInt32BE(16),
            data: buffer.subarray(20)
        };
        return data;
    }

    public static parseHexPacket(data: string) : DMRData {
        let rawBuffer = Buffer.from(data, 'hex');
        return this.parseRawPacket(rawBuffer);
    }

    public setDestination(dst: number) {
        const buf: Buffer = Buffer.alloc(4);
        buf.writeInt32BE(dst, 0);
        buf.copy(this.buffer, 8, 1, 4 );
        this.dmrData.destination = dst;
    }
    
    public setSource(src: number) {
        const buf: Buffer = Buffer.alloc(4);
        buf.writeInt32BE(src, 0);
        buf.copy(this.buffer, 5, 1, 4 );
        this.dmrData.source = src;
    }

    /**
     * From the 33 bytes of dmr data extract 108 bits from the start 
     * and 108 from the end discarding the 48 bits in the middle
     * 
     * @param dataIn 
     * 
     */
    public extractVoiceData(dataIn: Buffer) {

        let result: Buffer = Buffer.alloc(27);

        //first 13 bytes
        dataIn.copy(result, 0, 0, 13);
        
        //get halve bytes
        let n = dataIn.readUInt8(13) & 0xF0;
        let n1 = dataIn.readUInt8(19) & 0x0F;
        
        result.writeUInt8(n + n1, 13);
        
        //last 13 bytes
        dataIn.copy(result, 14, 20, 34);

        return result;
    }
}