'use strict';

const contracts = require('./contracts.js');
const fs = require('fs');

function loadFiles(files) {
  let out = {};
  for (let file of files) {
    out[file] = fs.readFileSync(file, 'utf8');
  }
  return out;
}

function deployFromFiles(web3, addr, names, files) {
  let sources = loadFiles(files);
  let ps = []
  let output = contracts.compile(sources);
  for (let name of Object.keys(output)) {
    let compiled = output[name];
    let abi = JSON.parse(compiled.interface);
    ps.push(contracts.deploy(web3, addr, abi, compiled.bytecode));
  }
  return Promise.all(ps);
}

module.exports = {deployFromFiles};
