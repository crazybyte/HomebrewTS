

export class BitArray {

    bits: Array<boolean>;
    buffer: Buffer;

    constructor() {
        this.bits = new Array<boolean>();
        this.buffer = Buffer.alloc(0);
    }

    setSize(size:number) {
        this.bits = new Array<boolean>(size);
        for (let i = 0 ; i<size; i++) {
            this.bits[i] = false;
        }

        this.buffer = Buffer.alloc(size/8);
    }
    
    getBits() {
        return this.bits;
    }

    getBitAt(position: number): boolean {
        return this.bits[position];
    }

    setBitAt(position: number, value:boolean) {
        this.bits[position] = value;
    }

    getBuffer() {
        this.setBits(this.bits);
        return this.buffer;
    }

    static fromBuffer(buffer:Buffer): BitArray {
        let bitArray = new BitArray();
        bitArray.setBuffer(buffer);
        return bitArray;
    }

    setBuffer(buffer:Buffer) {
        this.buffer = Buffer.from(buffer);
        for (let i = 0; i < buffer.length; i++) {
            let c = buffer.readUInt8(i);
            let s = c.toString(2).padStart(8,'0');

            for (let j = 0; j < 8; j++) {
                let m = s.substr(j,1);
                this.bits.push(m == "1");
            }
        }
    }

    setBits(bits: Array<boolean>) {
        this.bits = bits;
        let bytecount = Math.ceil(bits.length / 8);
        this.buffer = Buffer.alloc(bytecount);
        let position = 0;
        while (position < bytecount) {

            let tmp = 0;
            for (let j = 0; j < 8; j++) {
                tmp = (tmp << 1) + (bits[position * 8 + j] ? 1 : 0);
            }
            this.buffer.writeUInt8(tmp, position);
            position++;
        }
    }
   
    toString():string {
        let result = "";
        for (let i = 0 ; i<this.bits.length; i++) {
            result = result + (this.bits[i] ? "1":"0")
        }
        return result;
    }
}