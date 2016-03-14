# gooey

A tool to manage [Solidity](https://ethereum.github.io/solidity/) contracts.

## Installation

```
$ npm install --save-dev https://github.com/vasuman/gooey.git
```

## Directory structure

Keep all your contracts in a single directory.

```
contracts/
    ContractA.sol
    nested/
        ContractB.sol
    ...
```
## Usage

Invoke the `gooey` command and supply the path to the directory containing your
contracts.

```
$ gooey contracts/
```

Command should create a new *state file* named `main.json` (use the `-s` option to
change the name) in your contracts directory structured like,

```
{
    "ContractA": {
        "abi": [...],
        "code": "6060..."
    },
    "ContractB": {
        "abi": [...],
        "code": "6060..."
    },
    ...
}
```

Subsequent invocation of the command will read from this file to determine
whether the contract has changed.

Use the `-s` option to maintain seperate *state files* for your testnet and
homestead deployments. Like,

```
$ gooey -s test contracts/
```

### Deploy

You can specify the `-d` option to deploy your contracts. You need to setup a
deployment configuration first. Let's assume that we have a file called
`deploy.json` that looks like,

```
{
    "ContractA": {}
}
```

Invoke `gooey`,

```
$ gooey -d deploy.json contracts/
```

The *state file* entry for your contract will have an additional field
`address`, that gives you the address on the blockchain to which the contract
was deployed.

```
{
    "ContractA": {
        ...
        "address": "0xdeadbeef...."
    }
}
```

Contracts are only **re-deployed** if their code has changed.

## Todo

- [x] Utilities for testing
- [ ] Support contract linking
- [ ] Configurable `from` address
