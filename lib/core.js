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

function initState(config, compiled, prev) {
  function isDeployed(name) {
    return (name in prev) && prev[name].code === compiled[name].code &&
      prev[name].address;
  }

  let state = {};
  for (let name of Object.keys(config)) {
    if (!(name in compiled)) {
      throw new Error(`contract ${name} not compiled`);
    }
    let abi = compiled[name].abi;
    let code = compiled[name].code;
    state[name] = {abi, code};
    if (isDeployed(name)) {
      state[name].address = prev[name].address;
    }
  }
  return state;
}

function deploy(web3, config, state) {
  function doDeploy(address, name, args) {
    let abi = state[name].abi;
    let code = state[name].code;
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

  let contracts = {};
  let deploys = Object.keys(config).map(name => {
    if (state[name].address) {
      let contract = web3.eth.contract(state[name].abi).at(state[name].address);
      contracts[name] = contract;
      console.log(`contract ${name} unchanged`);
      return Promise.resolve(contract);
    }
    let from = config[name].from || web3.eth.coinbase;
    let p = doDeploy(from, name, []);
    return p.then(contract => {
      state[name].address = contract.address;
      contracts[name] = contract;
      console.log(`contract ${name} deployed at ${contract.address}`);
      return contract;
    });
  });
  return Promise.all(deploys).then(() => contracts);
}

function inject(web3, config, state, contracts, unchanged) {
  let injects = [];
  for (let name of Object.keys(config)) {
    if (!config[name].inject) {
      continue;
    }
    let from = config[name].from || web3.eth.coinbase;
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
  let state = null;
  try {
    state = initState(config, compiled, prev);
  } catch (e) {
    return Promise.reject(e.message);
  }
  if (dryRun) {
    return Promise.resolve(state);
  }
  let unchanged = {};
  for (let name of Object.keys(state)) {
    if (state[name].address) {
      unchanged[name] = true;
    }
  }
  return deploy(web3, config, state)
    .then(contracts => inject(web3, config, state, contracts, unchanged))
    .then(() => state);
}

module.exports = {execute, compile};
