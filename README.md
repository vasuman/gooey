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

The tool will automatically pick up all files with the `.sol` extension (use the
`-e` option to change).

## Contract linking

Since contracts deployed on the blockchain are immutable, it is recommended to
split your logic into multiple contracts and link them together. When you want
to fix a bug, you simply change the required contracts and link your new
contracts.

### Configuration

You need to setup a deployment configuration first. Let's assume that we have a
file called `config.json` (use the `-c` option to point to another file) that
looks like,

```
{
    "ContractA": {
        "from": "0xc0de..."
    },
    "ContractB": {
        "inject": [{
            "ref": "ContractA",
            "method": "setA"
        }]
    }
}
```

The `inject` section of each contract is a list of dependencies that need to be
injected to the contract. Each dependency lists a `ref` and `method`. The `ref`
is the name of the contract that you want to link. The `method` is the name of
the method that updates the linked contract address. In the above example,
ideally, the `setA` method will look something like,

```
contract ContractB {
    ContractA a;

    ...

    function setA(ContractA _a) {
        a = _a;
    }
}
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

Use the `-s` option to maintain seperate *state files* for your testnet and
homestead deployments.

If you choose to deploy your contracts (happens by default unless you use the
`-d` option which basically performs a dry run), the *state file* entry for your
contract will have an additional field `address`, that gives you the address on
the blockchain to which the contract was deployed.

```
{
    "ContractA": {
        ...
        "address": "0xdeadbeef..."
    },
    ...
}
```

Subsequent invocation of the command will read from this file to determine
whether the contract has changed.

Contracts are only **re-deployed** if their code has changed.

## Todo

- [x] Utilities for testing
- [x] Support contract linking
- [x] Configurable `from` address
- [ ] Refactor and cleanup
