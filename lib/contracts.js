'use strict';

const solc = require('solc');

const TX_DEPLOY_GAS = 1000000;

/**
 * Compiles Solidity contracts
 * @param {Object.<string, string>} sources Map of path to Solidity source code
 * @param {boolean} optimize Enable optimization
 * @return {Object.<string, Contract>} Contracts
 */
function compile(sources, optimize) {
  let inputs = {sources};
  let out = solc.compile(inputs, optimize ? 1 : 0);
  if (out.errors) {
    throw new Error(`Compiler error: ${out.errors.join('\n')}`);
  }
  return out.contracts;
}

/**
 * Deploys a contract on the blockchain.
 * @param {Web3} web3 Local instance
 * @param {string} address Address <b>from</b> which to deploy
 * @param {object} abi Interface of the contract
 * @param {string} code EVM bytecode of the contract
 * @return {Promise} Promise that resolves on done
 */
function deploy(web3, address, abi, code) {
  let tx = {
    data: code,
    from: address,
    gas: TX_DEPLOY_GAS
  };
  let contract = null;
  return new Promise((resolve, reject) => {
    web3.eth.contract(abi).new(tx, (err, data) => {
      if (err) {
        reject(err);
      } else {
        if (contract === null) {
          contract = data;
          return;
        }
        resolve(contract);
      }
    });
  });
}

module.exports = {compile, deploy};
