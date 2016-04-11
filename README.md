# gooey

A tool to manage [Solidity](https://ethereum.github.io/solidity/) contracts.

## Installation

Globally,

```
# npm install -g github:vasuman/gooey
```

Or locally for your package,

```
$ npm install --save-dev github:vasuman/gooey
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

> All problems in computer science can be solved by another level of
> indirection, except of course for the problem of too many indirections.
> -- <cite> David Wheeler </cite>

One of the most useful features of Solidity contracts is the ability to call
methods on other contracts at non-static addresses.

Since contracts deployed on the blockchain are immutable, it is advised that you
split your logic into multiple contracts and link them together. When you want
to fix a bug or something, you simply change the required contracts, deploy the
new versions and and updated their addresses in your existing contracts.

Assume that you've split your logic into two contracts such that `ContractB`
depends on `ContractA` and these two contracts can be independently deployed.
You add a method to `ContractB` which dynamically updates the address of
`ContractA`. Just make sure that this method can only be invoked by some
*restricted set of users* - preferably only the creator.

```
contract ContractB {
    ContractA a;

    address creator;

    modifier only(address addr) {
        if (msg.sender != addr) throw;
    }

    function ContractB() {
        creator = msg.sender;
    }

    ...

    function makeItHappen() {
        a.doSomething();
    }

    ...

    function setA(ContractA _a) only(creator) {
        a = _a;
    }
}
```

### Configuration

You need to setup a deployment configuration first. Let's assume that we have a
file called `config.json` (use the `-c` option to point to another file) that
looks like,

```js
{
    "ContractA": {
        "from": "0xc0de..." // account from which to deploy - must be unlocked
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
the method that updates the linked contract address.

Incase a `from` address is not specified, it defaults to using the coinbase
address.

## Usage

Start up your local Ethereum node with RPC support enabled and invoke the
`gooey` command supplying the path to the directory containing your contracts.

```
$ gooey contracts/
```

Command should create a new *state file* named `state.json` (use the `-s` option to
change the name) structured like,

```js
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

```js
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

## Testing Contracts

Import and use the `utils` submodule to help setup your contracts for testing.

I would highly recommend using the
[testrpc](https://github.com/ethereumjs/testrpc) server for testing.

```js
// deployment configuration
const contractDir = './contracts';
const config = require('./contracts/config.json');

// create web3 instance
let web3 = ...

let sources = utils.getSources(contractDir, '.sol');
let contracts = await utils.setupTest(web3, config, sources);
```

## Todo

- [x] Utilities for testing
- [x] Support contract linking
- [x] Configurable `from` address
- [x] Refactor and cleanup
