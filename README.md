# HomebrewTS

HomebrewTS is an implementation of a basic DMR Master and Peer based in the homebrew protocol. 

This is my free interpretation of the protocol and how to use it. Since the protocol documentation is scarce, much of the code is based and inspired by the hblink python implementation and the source code of MMDDVMHost. You can find both projects in github.

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


**important: use your own DMR ids and callsign in all the configurations.**


## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License
[GPL-3.0-or-later](https://choosealicense.com/licenses/gpl-3.0/)