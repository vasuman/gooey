'use strict';

const fs = require('fs');

const glob = require('glob');

const contracts = require('./contracts.js');

function loadFiles(files) {
  let out = {};
  for (let file of files) {
    out[file] = fs.readFileSync(file, 'utf8');
  }
  return out;
}

function compileDeploy(web3, addr, toDeploy, pattern) {
  let files = glob.sync(pattern);
  let sources = loadFiles(files);
  let output = contracts.compile(sources);
  let promises = [];
  for (let name of Object.keys(output)) {
    let compiled = output[name];
    let abi = JSON.parse(compiled.interface);
    if (toDeploy.indexOf(name) === -1) {
      promises.push(Promise.resolve([name, web3.eth.contract(abi)]));
    } else {
      let deployed = contracts.deploy(web3, addr, abi, compiled.bytecode, []);
      promises.push(deployed.then(contract => [name, contract]));
    }
  }
  return Promise.all(promises).then((pairs) => {
    let ret = {};
    for (let pair of pairs) {
      ret[pair[0]] = pair[1];
    }
    return ret;
  });
}

module.exports = {compileDeploy};
