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

You should have a file named `main.json` (use the `-f` option to change the
name) in your directory structured like,

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

Use the `-f` option to maintain files for your testnet and homestead deployments.

### Deploy

You can specify the `-d` option to deploy your contracts. You need to setup a
deployment configuration first. Let's assume that we have a file called
`deployment.json` that looks like,

```
{
    "ContractA": {}
}
```

Invoke `gooey`,

```
$ gooey -d deployment.json contracts/
```

The `main.json` entry for your contract will have an additional field `address`,
that gives you the address on the blockchain to which the contract was deployed.

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

- [ ] Support contract linking
- [ ] Configurable `from` address
