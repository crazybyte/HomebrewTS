
/**
 * 
 * This class is a port of CBPTC19696.cpp from the MVMDHOST project from g4klx
 *  
 * https://github.com/g4klx/MMDVMHost
 * 
 */


export class CBPTC19696 {

    private rawData: Array<boolean>;
    private deInterData: Array<boolean>;

    constructor() {
        this.rawData = new Array<boolean>(196);
        this.deInterData = new Array<boolean>(196);
    }

    public decode(dataIn: Buffer): Buffer {
        
        this.decodeExtractBinary(dataIn);

        this.decodeDeInterleave()

        this.decodeErrorCheck();

        return this.decodeExtractData();
    }   
    
    private decodeExtractBinary(dataIn: Buffer) {
        
        //First block 
        this.byteToBitsBE(dataIn.readUInt8(0), 0* 8);
        this.byteToBitsBE(dataIn.readUInt8(1), 1* 8);
        this.byteToBitsBE(dataIn.readUInt8(2), 2* 8);
        this.byteToBitsBE(dataIn.readUInt8(3), 3* 8);
        this.byteToBitsBE(dataIn.readUInt8(4), 4* 8);
        this.byteToBitsBE(dataIn.readUInt8(5), 5* 8);
        this.byteToBitsBE(dataIn.readUInt8(6), 6* 8);
        this.byteToBitsBE(dataIn.readUInt8(7), 7* 8);
        this.byteToBitsBE(dataIn.readUInt8(8), 8* 8);
        this.byteToBitsBE(dataIn.readUInt8(9), 9* 8);
        this.byteToBitsBE(dataIn.readUInt8(10), 10* 8);
        this.byteToBitsBE(dataIn.readUInt8(11), 11* 8);
        this.byteToBitsBE(dataIn.readUInt8(12), 12* 8);

        // Handle the two bits
        let n = dataIn.readUInt8(20);
        
        this.rawData[98] = (n & 0x02 ) != 0;
        this.rawData[99] = (n & 0x01 ) != 0;

        //Block 2
        this.byteToBitsBE(dataIn.readUInt8(21), 100 + 0 * 8);
        this.byteToBitsBE(dataIn.readUInt8(22), 100 + 1 * 8);
        this.byteToBitsBE(dataIn.readUInt8(23), 100 + 2 * 8);
        this.byteToBitsBE(dataIn.readUInt8(24), 100 + 3 * 8);
        this.byteToBitsBE(dataIn.readUInt8(25), 100 + 4 * 8);
        this.byteToBitsBE(dataIn.readUInt8(26), 100 + 5 * 8);
        this.byteToBitsBE(dataIn.readUInt8(27), 100 + 6 * 8);
        this.byteToBitsBE(dataIn.readUInt8(28), 100 + 7 * 8);
        this.byteToBitsBE(dataIn.readUInt8(29), 100 + 8 * 8);
        this.byteToBitsBE(dataIn.readUInt8(30), 100 + 9 * 8);
        this.byteToBitsBE(dataIn.readUInt8(31), 100 + 10 * 8);
        this.byteToBitsBE(dataIn.readUInt8(32), 100 + 11 * 8);
        

    }

    private decodeDeInterleave() {
        for (let i = 0; i < 196; i++) {
            this.deInterData[i] = false;
        }

        // The first bit is R(3) which is not used so can be ignored
        for (let a = 0; a < 196; a++)	{
            // Calculate the interleave sequence
            let interleaveSequence = (a * 181) % 196;
            // Shuffle the data
            this.deInterData[a] = this.rawData[interleaveSequence];
        }
    }
    
    private decodeErrorCheck() {

    }

    private decodeExtractData(): Buffer {
        let bData = new Array<boolean>(96);
        let pos = 0;

        for (let a = 4; a <= 11; a++, pos++)
		    bData[pos] = this.deInterData[a];

        for (let a = 16; a <= 26; a++, pos++)
            bData[pos] = this.deInterData[a];

        for (let a = 31; a <= 41; a++, pos++)
            bData[pos] = this.deInterData[a];

        for (let a = 46; a <= 56; a++, pos++)
            bData[pos] = this.deInterData[a];

        for (let a = 61; a <= 71; a++, pos++)
            bData[pos] = this.deInterData[a];

        for (let a = 76; a <= 86; a++, pos++)
            bData[pos] = this.deInterData[a];

        for (let a = 91; a <= 101; a++, pos++)
            bData[pos] = this.deInterData[a];

        for (let a = 106; a <= 116; a++, pos++)
            bData[pos] = this.deInterData[a];

        for (let a = 121; a <= 131; a++, pos++)
            bData[pos] = this.deInterData[a];

        
        let b: Buffer = Buffer.alloc(12)
        
        pos = 0;
        let n = 0;
        for (let i = 0; i<12; i++) {

            n = 0;
            for (let j = 0 ; j< 8; j++, pos++) {
                if (bData[pos]) {
                    n=n + (1 << (7-j));
                }
            }
            b.writeUInt8(n, i);
        }
        
        return b;
    }

    private byteToBitsBE(n: number, position: number) {

        for (let i = 7; i>=0; i--) {
            let n1 = 0x01 << i
            this.rawData[position + 7-i] = (n & n1) != 0
        }

    }


}