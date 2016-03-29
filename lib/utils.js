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
  let ret = {};
  let sources = loadFiles(files);
  let ps = [];
  let output = contracts.compile(sources);
  for (let name of names) {
    let compiled = output[name];
    if (!compiled) {
      return Promise.reject(`contract ${name} not compiled`);
    }
    let abi = JSON.parse(compiled.interface);
    let p = contracts.deploy(web3, addr, abi, compiled.bytecode);
    ps.push(p.then(contract => {
      ret[name] = contract;
    }));
  }
  return Promise.all(ps).then(() => {
    return ret;
  });
}

function getAccounts(web3) {
  return new Promise((resolve, reject) => {
    web3.eth.getAccounts((err, acc) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(acc);
    });
  });
}

module.exports = {getAccounts, deployFromFiles};
