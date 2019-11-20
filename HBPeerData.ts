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

    constructor(id:number, address: AddressInfo) {
        this.lastPing = new Date();
        this.id = id;
        this.address = address;
        this.salt = HBUtils.getRandomInt(0, 0xFFFFFFFF); //4 bytes random
    }



}