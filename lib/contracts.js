'use strict';

const solc = require('solc');

/**
 * Compiles Solidity contracts
 * @param {object.<string, string>} sources Map of path to Solidity source code
 * @param {boolean} optimize Enable optimization
 * @return {object} Contracts
 */
function compile(sources, optimize) {
  let inputs = {sources};
  let out = solc.compile(inputs, optimize ? 1 : 0);
  if (out.errors) {
    throw new Error(`Compiler error: ${out.errors.join('\n')}`);
  }
  let compiled = {};
  for (let name of Object.keys(out.contracts)) {
    let contract = out.contracts[name];
    compiled[name] = {
      abi: JSON.parse(contract.interface),
      code: contract.bytecode
    };
  }
  return compiled;
}

/**
 * Deploys a contract on the blockchain.
 * @param {Web3} web3 Local instance
 * @param {string} address Address <b>from</b> which to deploy
 * @param {object} abi Interface of the contract
 * @param {string} code EVM bytecode of the contract
 * @param {object[]} args Arguments to contract constructor
 * @return {Promise} Promise that resolves when deployed
 */
function deploy(web3, address, abi, code, args) {
  let tx = {
    data: code,
    from: address
  };
  let flag = false;
  return new Promise((resolve, reject) => {
    web3.eth.contract(abi).new(...args, tx, (err, data) => {
      if (err) {
        reject(err);
      } else {
        if (!flag) {
          flag = true;
          return;
        }
        resolve(data);
      }
    });
  });
}

/**
 * Deploys changed contracts and injects dependencies.
 * @param {Web3} web3 Local instance
 * @param {object} config Deployment configuration
 * @param {object} prev Previous state
 * @param {object} compiled Contract compilation output
 * @param {boolean} dryRun Skips contract deployment
 * @return {Promise} Promise that resolves with the current state
 */
function execute(web3, config, prev, compiled, dryRun) {
  function isDeployed(name) {
    return (name in prev) && prev[name].code === compiled[name].code &&
      prev[name].address;
  }

  let state = {};
  let unchanged = {};
  for (let name of Object.keys(config)) {
    if (!(name in compiled)) {
      return Promise.reject(`contract ${name} not compiled`);
    }
    let abi = compiled[name].abi;
    let code = compiled[name].code;
    state[name] = {abi, code};
    if (isDeployed(name)) {
      state[name].address = prev[name].address;
      unchanged[name] = true;
    }
  }

  if (dryRun) {
    return Promise.resolve(state);
  }

  let coinbase = web3.eth.coinbase;
  let contracts = {};
  let deploys = Object.keys(config).map(name => {
    if (state[name].address) {
      let contract = web3.eth.contract(state[name].abi).at(state[name].address);
      contracts[name] = contract;
      console.log(`contract ${name} unchanged`);
      return Promise.resolve(contract);
    }
    let from = config[name].from || coinbase;
    let p = deploy(web3, from, state[name].abi, state[name].code, []);
    return p.then(contract => {
      state[name].address = contract.address;
      contracts[name] = contract;
      console.log(`contract ${name} deployed at ${contract.address}`);
      return contract;
    });
  });

  return Promise.all(deploys).then(() => {
    let injects = [];
    for (let name of Object.keys(config)) {
      if (!config[name].inject) {
        continue;
      }
      let from = config[name].from || coinbase;
      for (let dep of config[name].inject) {
        let ref = dep.ref;
        let method = dep.method;
        if (!(ref in state) || !state[ref].address) {
          return Promise.reject(`dependency ${ref} of ` +
                                `contract ${name} not satisfied`);
        }
        let contract = contracts[name];
        if (typeof contract[method] !== 'function') {
          return Promise.reject(`contract ${name} does not contain ` +
                                `method ${method}`);
        }
        if (unchanged[name] && unchanged[ref]) {
          console.log(`contract ${name} and dependency ${ref} unchanged`);
          continue;
        }
        let addr = state[ref].address;
        injects.push(new Promise((res, rej) => {
          contract[method](addr, {from}, err => {
            if (err) {
              return rej(err);
            }
            console.log(`injected ${ref}(${addr}) via ` +
                        `${name}(${contract.address}).${method}`);
            res();
          });
        }));
      }
    }
    return Promise.all(injects);
  }).then(() => state);
}

module.exports = {execute, compile, deploy};
