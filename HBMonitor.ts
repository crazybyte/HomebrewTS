import { HBPeer } from "./HBPeer";
import express from 'express';
import { configure } from "winston";
import * as request from "request-promise-native";

export class HBMonitor {

    private app: express.Application;
    private peers: Array<HBPeer> = new Array<HBPeer>();
    private port: number = 8080;

    constructor() {
        this.app = express();

        this.configure();
        this.start()
    }

    configure() {
        this.app.use('/', express.static("public"));


        this.app.use('/dmrid/:id', (req,res) =>{
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Content-Type', 'application/json');

            let id = req.params['id'];
            
            request.get('https://www.radioid.net/api/dmr/user/?id=' + id).
            
            then((data) => {
                res.send(data);
                }
              );
        })

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


}