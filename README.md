# HomebrewTS

HomebrewTS is an implementation of a basic DMR Master and Peer based in the homebrew protocol. 

This is my free interpretation of the protocol and how to use it. Since the protocol documentation is scarce, much of the code is based and inspired by the hblink python implementation and the source code of MMDDVMHost. You can find both projects in github.

**important: use your own DMR ids and callsign in all the configurations.**

## Installation

Clone or download the code and use the npm package manager to install.

```bash
npm install
```

## Compilation

```bash
npm run tsc
```

The resulting .js files will be published in the *build* folder.

## Running

```bash
node ./build/bridgeMaster.js
```

## Applications included

* **bridgeMaster.js**. Sample application that consist of a master and two peers. One of the peers connects to the master and the other connects to a official dmr master.

* **dumper.js**: An application to dump the dmr calls into .dmr files
* **injector.js**: Application to resend previously saved .dmr files.

The bridgeMaster application includes a monitoring server that runs on port 8080. There monitoring application does not have any builtin security. 


## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[GPL-3.0-or-later](https://choosealicense.com/licenses/gpl-3.0/)