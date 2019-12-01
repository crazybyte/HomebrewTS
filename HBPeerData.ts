import { Socket } from "dgram";
import { AddressInfo } from 'net';
import { HBUtils, HBStatus } from './HBUtils';

export class HBPeerData {

    status: HBStatus = HBStatus.closed;
    lastPing: Date;
    id: number;
    address: AddressInfo;
    salt: number;

    //communications
    pingNumber: number = 0; //number of pings received
    pingMissed: number = 0; //number of missed pings

    //config
    callSign!: string;
    rxFreq!: string;
    txFreq!: string;
    txPower!: string;
    colorCode!: string;
    latitude!: string;
    longitude!: string;
    height!: string;
    location!: string;
    description!: string;
    slots!: string;
    url!: string;
    softwareId!: string;
    packageId!: string;
    tgs: Set<number> = new Set<number>();
    tgsArray : Array<number> = new Array<number>();

    constructor(id:number, address: AddressInfo) {
        this.lastPing = new Date();
        this.id = id;
        this.address = address;
        this.salt = HBUtils.getRandomInt(0, 0xFFFFFFFF); //4 bytes random
    }

     /**
     * 
     * @param n Add tg to the list of tgs this peer is interested in
     */
    public addTg(n:number) {
        if (!this.tgs.has(n)){
          this.tgs.add(n);
        }
  
        if (n == 4000) {
          this.tgs.clear();
        }

        this.tgsArray = Array.from(this.tgs);
      }

    public hasTg(n:number) {

          if (n == this.id) {
            return true;
          }

          //check if destination is ourselves, ej destination is 2143827 and we are 214382799 (with two digits suffix)
          if (n.toString().length == 5 && this.id.toString().length == 9) {
            if (this.id.toString().startsWith(n.toString())) {
              return true;
            }
          }

          return this.tgs.has(n);
      }
}