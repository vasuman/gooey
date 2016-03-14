#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const cmd = require('commander');
const Web3 = require('web3');

const gooey = require('../index.js');

cmd
  .option('-a --address', 'RPC address of local ethereum node',
          'http://localhost:8545')
  .option('-d --deploy <config>', 'Deploy contracts on blockchain', '')
  .option('-s --state <name>', 'Base state file name', 'main')
  .option('-e --ext <extension>', 'Extension of contract files', '.sol')
  .arguments('<contract-dir>')
  .action(main)
  .parse(process.argv);

function compileAll(contractDir) {
  let sources = {};

  function recurse(dir) {
    let files = fs.readdirSync(dir);
    for (let f of files) {
      let full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) {
        recurse(full);
      } else if (f.endsWith(cmd.ext)) {
        let src = fs.readFileSync(full, 'utf8');
        console.log(`compiling file, ${full}`);
        sources[full] = src;
      }
    }
  }

  recurse(contractDir);
  return gooey.contracts.compile(sources, true);
}

function merge(dir, contracts) {
  let fPath = path.join(dir, `${cmd.state}.json`);
  let existing = null;

  function write() {
    fs.writeFileSync(fPath, JSON.stringify(contracts, null, 4), 'utf8');
  }

  function exists(name, code) {
    return existing && existing[name] && existing[name].code === code;
  }

  function isDeployed(name, code) {
    return exists(name, code) && existing[name].address;
  }

  try {
    existing = JSON.parse(fs.readFileSync(fPath, 'utf8'));
  } catch (e) {}

  for (let name of Object.keys(contracts)) {
    if (isDeployed(name, contracts[name].code)) {
      contracts[name].address = existing[name].address;
    }
  }

  if (!cmd.deploy) {
    write();
    return;
  }

  let cfg = JSON.parse(fs.readFileSync(cmd.deploy), 'utf8');
  let ps = [];
  let web3 = new Web3(new Web3.providers.HttpProvider(cmd.address));
  for (let name of Object.keys(contracts)) {
    if (name in cfg) {
      if (contracts[name].address) {
        console.log(`contract ${name} already deployed`);
        continue;
      }
      // TODO: contract linking
      console.log(`deploying contract, ${name}`);
      let abi = contracts[name].abi;
      let code = contracts[name].code;
      let p = gooey.contracts.deploy(web3, web3.eth.coinbase, abi, code);
      ps.push(p.then(c => {
        console.log(`contract ${name} deployed at ${c.address}`);
        contracts[name].address = c.address;
      }));
      Promise.all(ps).then(write).catch(console.error);
    }
  }
}

function main(contractDir) {
  let compiled = compileAll(contractDir);
  let contracts = {};
  for (let name of Object.keys(compiled)) {
    let contract = compiled[name];
    contracts[name] = {
      abi: JSON.parse(contract.interface),
      code: contract.bytecode
    };
  }
  merge(contractDir, contracts);
}
