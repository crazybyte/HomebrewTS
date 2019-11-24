import { HBPeer } from "./HBPeer";
import express from 'express';
import basicAuth from 'express-basic-auth';
import { configure } from "winston";
import * as request from "request-promise-native";
import { HBMaster } from "./HBMaster";

export class HBMonitor {

    private app: express.Application;
    private peers: Array<HBPeer> = new Array<HBPeer>();
    private masters: Array<HBMaster> = new Array<HBMaster>();
    private port: number = 8080;

    private mapUsers: Map<number,object> = new Map<number,object>();
    
    constructor() {
        this.app = express();
        this.app.use(basicAuth({
            users: { 'admin': 'supersecret' },
            challenge: true,
            realm: 'HBTsMonitor',
        }));

        this.configure();
        this.start()
    }

    configure() {
        this.app.use('/', express.static("public"));

        this.app.use('/dmrid/:id', (req,res) =>{
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Content-Type', 'application/json');

            let id = parseInt(req.params['id']);
            
            if (this.mapUsers.has(id)) {
                res.send(this.mapUsers.get(id));
            } else {

                request.get('https://www.radioid.net/api/dmr/user/?id=' + id).
                then((data) => {
                        let jdata = JSON.parse(data);
                        if (jdata.count > 0) {
                            this.mapUsers.set(id, data);
                        }
                        res.send(data);
                    }
                );
            }
        });

        this.app.use('/masters', (req, res) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Content-Type', 'application/json');

            let masters = [];

            for (let master of this.masters){
                let mdata = {
                    port: master.config.port,
                    address: master.config.address,
                    status: master.status,
                    peers: master.getPeers()
                }
                masters.push(mdata);
            }
            res.send(JSON.stringify(masters));
        });

        this.app.use('/peers', (req, res) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Content-Type', 'application/json');
            
            let peers = [];
            
            for (let peer of this.peers){
                let pdata = {
                    id: peer.config.id,
                    masterid: peer.config.masterId,
                    streams: peer.getStreams(),
                    masterPort: peer.config.masterPort,
                    masterAddress: peer.config.masterAddress,
                    status: peer.status
                }
                peers.push(pdata);
            }
            res.send(JSON.stringify(peers));
        });
    }

    start() {
        this.app.listen(this.port, () => {
            console.log(`App listening on the http://localhost:${this.port}`)
        })
    }


    public addPeer(peer: HBPeer) {
        this.peers.push(peer);
    }

    public addMaster(master: HBMaster) {
        this.masters.push(master);
    }
}