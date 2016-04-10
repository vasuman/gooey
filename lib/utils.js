'use strict';

const fs = require('fs');
const path = require('path');

const core = require('./core.js');

function getSources(contractDir, ext) {
  let sources = {};
  function recurse(dir) {
    let files = fs.readdirSync(dir);
    for (let f of files) {
      let full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        recurse(full);
      } else if (f.endsWith(ext)) {
        sources[full] = fs.readFileSync(full, 'utf8');
      }
    }
  }
  recurse(contractDir);
  return sources;
}

function fromState(web3, state) {
  let contracts = {};
  for (let name of Object.keys(state)) {
    let contract = web3.eth.contract(state[name].abi).at(state[name].address);
    contracts[name] = contract;
  }
  return contracts;
}

function setupTest(web3, config, sources) {
  let compiled = core.compile(sources, true);
  return core.execute(web3, config, {}, compiled, false).then(state => {
    let contracts = fromState(web3, state);
    for (let name of Object.keys(compiled)) {
      if (!(name in contracts)) {
        // copy undeployed contracts
        contracts[name] = web3.eth.contract(compiled[name].abi);
      }
    }
    return contracts;
  });
}

module.exports = {getSources, setupTest, fromState};
