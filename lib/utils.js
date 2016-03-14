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

function deployFromFiles(web3, addr, name, files) {
  let sources = loadFiles(files);
  let compiled = contracts.compile(sources)[name];
  let abi = JSON.parse(compiled.interface);
  return contracts.deploy(web3, addr, abi, compiled.bytecode);
}

module.exports = {loadFiles, deployFromFiles};
