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
            data: ""
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
            data: buffer.subarray(16).toString('hex')
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
}