'use strict';

let Web3 = require('web3');
let solc = require('solc');
let fs = require('fs');

const TX_GAS = 1000000;

let web3;

function init(rpcAddr) {
  web3 = new Web3(new Web3.providers.HttpProvider(rpcAddr));
}

function isConnected() {
  return web3.isConnected();
}

function deployContract(path, done) {
  let src = fs.readFileSync(path, {encoding: 'utf8'});
  let inputs = {sources: {}};
  inputs.sources[path] = src;
  let out = solc.compile(inputs);
  if (out.errors) {
    throw new Error(`Compiler error: ${out.errors.join('\n')}`);
  }
  let contractName = Object.keys(out.contracts)[0];
  let abi = JSON.parse(out.contracts[contractName].interface);
  let code = out.contracts[contractName].bytecode;
  let tx = {
    data: code,
    from: web3.eth.coinbase,
    gas: TX_GAS
  };
  let contract = null;
  web3.eth.contract(abi).new(tx, (err, data) => {
    if (err) {
      return done(err);
    }
    if (contract === null) {
      contract = data;
      return;
    }
    done(null, contract);
  });
}

module.exports = {init, isConnected, deployContract};
