import { spawn } from 'child_process';



export class Sox {


    constructor() {

    }

    static transcode (inFile: string, outFile: string, options: string[], callback: (code: number) => void) {

        let args = options;

        args.push ("--show-progress");
        args.push(inFile);
        args.push(outFile);

        

        var bin = spawn('sox', args);

        bin.on('error', function(data) {
            console.log("Error:" + data);
        });

        bin.stdout.setEncoding('utf8');
        bin.stdout.on('data', function(data) {
            console.log(data);
        });

        bin.stderr.setEncoding('utf8');
        bin.stderr.on('data', function(data) {
            console.log(data);
        });

        bin.on('close', function(code) {
            console.log("sox return code: " + code);
            callback (code);
          });

       
    }

}


//test
/*Sox.transcode("pcm.raw", "pcm.wav", '-r 8000 -e signed-integer -L -b 16 -c 1 -v 5'.split(' '), (code) => {
    console.log("Result: " + code);
})
*/

