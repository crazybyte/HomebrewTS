import { BitArray} from './BitArray'


/**
 * 
 * This class is just a port to typescript of the python version by n0mjs710
 * 
 * available at https://github.com/n0mjs710/dmr_utils/
 * 
 * Thanks for the hard work!!!
 * 
 */


export class DMRUtils {

/** 
* DMR AMBE interleave schedule
**/
rW = [
      0, 1, 0, 1, 0, 1,
      0, 1, 0, 1, 0, 1,
      0, 1, 0, 1, 0, 1,
      0, 1, 0, 1, 0, 2,
      0, 2, 0, 2, 0, 2,
      0, 2, 0, 2, 0, 2
      ]

rX = [
      23, 10, 22, 9, 21, 8,
      20, 7, 19, 6, 18, 5,
      17, 4, 16, 3, 15, 2,
      14, 1, 13, 0, 12, 10,
      11, 9, 10, 8, 9, 7,
      8, 6, 7, 5, 6, 4
      ]

rY = [
      0, 2, 0, 2, 0, 2,
      0, 2, 0, 3, 0, 3,
      1, 3, 1, 3, 1, 3,
      1, 3, 1, 3, 1, 3,
      1, 3, 1, 3, 1, 3,
      1, 3, 1, 3, 1, 3
      ]

rZ = [
      5, 3, 4, 2, 3, 1,
      2, 0, 1, 13, 0, 12,
      22, 11, 21, 10, 20, 9,
      19, 8, 18, 7, 17, 6,
      16, 5, 15, 4, 14, 3,
      13, 2, 12, 1, 11, 0
      ]


/** 
* This function calculates [23,12] Golay codewords.
* The format of the returned longint is [checkbits(11),data(12)].
**/
golay2312(cw:any) {
    let POLY = 0xAE3            /* or use the other polynomial, 0xC75 */
    cw = cw & 0xfff             // Strip off check bits and only use data
    let c = cw                      /* save original codeword */
    for (let i = 1; i<13; i++) {
                               /* examine each data bit */
        if (cw & 1) {            /* test data bit */
            cw = cw ^ POLY      /* XOR polynomial */
        }
        cw = cw >> 1            /* shift intermediate result */
    }
    return((cw << 12) | c)      /* assemble codeword */
}

/**
* This function checks the overall parity of codeword cw.
* If parity is even, 0 is returned, else 1.
**/
parity(cw:any) {
    /* XOR the bytes of the codeword */
    let p = cw & 0xff
    p = p ^ ((cw >> 8) & 0xff)
    p = p ^ ((cw >> 16) & 0xff)
    
    /* XOR the halves of the intermediate result */
    p = p ^ (p >> 4)
    p = p ^ (p >> 2)
    p = p ^ (p >> 1)
    
    /* return the parity result */
    return(p & 1)
}

/** 
 * Demodulate ambe frame (C1)
 * Frame is an array [4][24]
 **/
    demodulateAmbe3600x2450(ambe_fr: BitArray){
        let pr: Array<number> = new Array<number>(115);
        let foo = 0

        for (let i = 0; i< pr.length; i++) {
            pr[i] = 0;
        }

        // create pseudo-random modulator
        for (let i =23; i>11; i--) {
            foo = foo << 1
            foo = foo | (ambe_fr.getBitAt(0 + i) ? 1 : 0)
        }
        pr[0] = (16 * foo)
        
        for (let i =1; i<24; i++) {
            let tmp = (173 * pr[i - 1]) + 13849
            let tmp1 = ((tmp>>16) & 0xFFFF ) << 16
            pr[i] =  tmp -tmp1
        }
        for (let i =1; i<24; i++) {
            pr[i] = pr[i] >> 15
        }

        //demodulate ambe_fr with pr
        let k = 1
        for (let j = 22; j>-1; j--) {
            let xx = ambe_fr.getBitAt(1 * 24 + j)
            ambe_fr.setBitAt(1 * 24 + j, ((ambe_fr.getBitAt(1 * 24 + j) ? 1 : 0) ^ pr[k]) ? true : false);
            k = k + 1
        }
        return ambe_fr  // Pass it back since there is no pass by reference
        }

    eccAmbe3600x2450Data(ambe_fr: BitArray){
        let ambe: Array<boolean> = new Array<boolean>();
        
        // just copy C0
        for (let j = 23; j > 11; j--) {
            ambe.push(ambe_fr.getBitAt(j))
        }
        
    /*
    #        # ecc and copy C1
    #        gin = 0
    #        for j in range(23):
    #            gin = (gin << 1) | ambe_fr[1][j]
    #
    #        gout = BitArray(hex(golay2312(gin)))
    #        for j in range(22, 10, -1):
    #            ambe[bitIndex] = gout[j]
    #            bitIndex += 1
    */
        for (let j = 22; j > 10; j--) {
            ambe.push(ambe_fr.getBitAt(1 * 24  + j));
        }

        // just copy C2
        for (let j = 10; j>-1; j--) {
            ambe.push(ambe_fr.getBitAt(2 * 24 + j));
        }

        // just copy C3
        for (let j = 13; j>-1; j--) {
            ambe.push(ambe_fr.getBitAt(3 * 24 + j));
        }

        let ba = new BitArray();
        ba.setBits(ambe);
        return ba;
        }

    /** 
     *  Convert a 49 bit raw AMBE frame into a deinterleaved structure (ready for decode by AMBE3000)
     **/
    convert49BitAmbeTo72BitFrames( ambe_d: BitArray ):BitArray  {
        let index = 0
        let ambe_fr = new BitArray();
        ambe_fr.setSize( 24 * 4 );
        
        //[[None for x in range(24)] for y in range(4)]
        for (let i = 0; i<24*4; i++) {
            ambe_fr.setBitAt(i, false);
        }

        //Place bits into the 4x24 frames.  [bit0...bit23]
        //fr0: [P e10 e9 e8 e7 e6 e5 e4 e3 e2 e1 e0 11 10 9 8 7 6 5 4 3 2 1 0]
        //fr1: [e10 e9 e8 e7 e6 e5 e4 e3 e2 e1 e0 23 22 21 20 19 18 17 16 15 14 13 12 xx]
        //fr2: [34 33 32 31 30 29 28 27 26 25 24 x x x x x x x x x x x x x]
        //fr3: [48 47 46 45 44 43 42 41 40 39 38 37 36 35 x x x x x x x x x x]

        // ecc and copy C0: 12bits + 11ecc + 1 parity
        // First get the 12 bits that actually exist
        // Then calculate the golay codeword
        // And then add the parity bit to get the final 24 bit pattern

        let tmp = 0
        //grab the 12 MSB
        for (let i = 11; i>-1; i--) {
            tmp = (tmp << 1) | (ambe_d.getBitAt(i) ? 1 : 0)
        }

        tmp = this.golay2312(tmp)               //Generate the 23 bit result
        let parityBit = this.parity(tmp)
        tmp = tmp | (parityBit << 23)           //And create a full 24 bit value
        
        for (let i = 23; i>-1; i--) {
            ambe_fr.setBitAt(i, (tmp & 1) ? true : false);
            tmp = tmp >> 1
        }

        // C1: 12 bits + 11ecc (no parity)
        tmp = 0
        //grab the next 12 bits
        for (let i = 23; i>11; i--) {
            tmp = (tmp << 1) | (ambe_d.getBitAt(i) ? 1 : 0)
        }
        
        tmp = this.golay2312(tmp)                    //Generate the 23 bit result
        
        for (let j = 22; j>-1; j--) {
            ambe_fr.setBitAt(1*24 + j, (tmp & 1) ? true : false);
            tmp = tmp >> 1;
        }

        //C2: 11 bits (no ecc)
        for (let j = 10; j>-1; j--) {
            ambe_fr.setBitAt(2*24 + j, ambe_d.getBitAt(34 - j));
        }

        //C3: 14 bits (no ecc)
        for (let j = 13; j>-1; j--) {
            ambe_fr.setBitAt(3*24 + j, ambe_d.getBitAt(48 - j));
        }

        return ambe_fr
    }   

    interleave(ambe_fr: BitArray){
        let bitIndex = 0
        let w = 0
        let x = 0
        let y = 0
        let z = 0
        let data = new Uint8Array(9)

        for (let i = 0; i<36; i++) {
            let bit1:number  = ambe_fr.getBitAt(this.rW[w] * 24 + this.rX[x]) ? 1 : 0 // bit 1
            let bit0:number  = ambe_fr.getBitAt(this.rY[y] * 24 + this.rZ[z]) ? 1 : 0 // bit 0

            data[bitIndex >> 3] = ((data[bitIndex >> 3] << 1) & 0xfe) | ( (bit1 == 1) ? 1 : 0)
            bitIndex += 1

            data[bitIndex >> 3] = ((data[bitIndex >> 3] << 1) & 0xfe) | ((bit0 == 1) ?1 : 0)
            bitIndex += 1

            w += 1
            x += 1
            y += 1
            z += 1
        }

        let ba = BitArray.fromBuffer(Buffer.from(data));
        return ba;
    }

    deinterleave(data:BitArray):BitArray {
        
        let ambe_fr = new BitArray()
        ambe_fr.setSize(24 * 4);

        let bitIndex = 0
        let w = 0
        let x = 0
        let y = 0
        let z = 0
        for (let i = 0; i<36; i++) {
            let bit1 = data.getBitAt(bitIndex)
            bitIndex += 1

            let bit0 = data.getBitAt(bitIndex)
            bitIndex += 1

            ambe_fr.setBitAt(this.rW[w]* 24 + this.rX[x], bit1); // bit 1
            ambe_fr.setBitAt(this.rY[y]* 24 + this.rZ[z], bit0); // bit 0

            w += 1
            x += 1
            y += 1
            z += 1
        }
        return ambe_fr
    }

    convert72BitTo49BitAMBE( ambe72:BitArray ){
        let ambe_fr = this.deinterleave(ambe72)                 // take 72 bit ambe and lay it out in C0-C3
        //console.log("deinterleave " + ambe_fr.toString()); 
        ambe_fr = this.demodulateAmbe3600x2450(ambe_fr)         // demodulate C1
        //console.log("demodulateAmbe3600x2450 " + ambe_fr.toString());
        let ambe49 = this.eccAmbe3600x2450Data(ambe_fr)         // pick out the 49 bits of raw ambe
        //console.log("eccAmbe3600x2450Data " + ambe49.toString());
        return ambe49
    }

    convert49BitTo72BitAMBE( ambe49:BitArray ) {
        let ambe_fr = this.convert49BitAmbeTo72BitFrames(ambe49)   // take raw ambe 49 + ecc and place it into C0-C3
        //console.log("convert49BitAmbeTo72BitFrames " + ambe_fr.toString()); 
        ambe_fr = this.demodulateAmbe3600x2450(ambe_fr)            // demodulate C1
        //console.log("demodulateAmbe3600x2450 " + ambe_fr.toString()); 
        let ambe72 = this.interleave(ambe_fr);                     // Re-interleave it, returning 72 bits
        return ambe72
    }

    
  
}

/*
function testit(){

    let utils: dmr_utils = new dmr_utils();

    //let ambe72 = BitArray.fromBuffer(Buffer.from('ACAA40200044408080', 'hex'))
    let ambe72 = BitArray.fromBuffer(Buffer.from('e5a8c54557061dec0a', 'hex'))
    console.log('ambe72=' + ambe72.getBuffer().toString('hex'))
    
    let ambe49 = utils.convert72BitTo49BitAMBE(ambe72)
    console.log('ambe49=' + ambe49.getBuffer().toString('hex'))

    ambe72 = utils.convert49BitTo72BitAMBE(ambe49)
    console.log('ambe72=' + ambe72.getBuffer().toString('hex'))
}

testit()
*/