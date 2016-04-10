#!/usr/bin/env node

'use strict';

const fs = require('fs');

const cmd = require('commander');
const Web3 = require('web3');

const core = require('../lib/core.js');
const utils = require('../lib/utils.js');

cmd
  .option('-a --address <addr>', 'RPC address of local ethereum node',
          'http://localhost:8545')
  .option('-c --config <config>', 'Configuration file', 'config.json')
  .option('-s --state <name>', 'State file name', 'state.json')
  .option('-e --ext <extension>', 'Extension of contract files', '.sol')
  .option('-d --dry-run', 'Skip contract deployment')
  .arguments('<contract-dir>')
  .action(main)
  .parse(process.argv);

function main(contractDir) {
  let web3 = new Web3(new Web3.providers.HttpProvider(cmd.address));
  let sources = utils.getSources(contractDir, cmd.ext);
  let compiled = core.compile(sources, true);
  let prev = {};
  try {
    prev = JSON.parse(fs.readFileSync(cmd.state, 'utf8'));
  } catch (e) {
    console.log('no previous state file found');
  }
  let config = JSON.parse(fs.readFileSync(cmd.config, 'utf8'));
  core.execute(web3, config, prev, compiled, cmd.dryRun).then(state => {
    fs.writeFileSync(cmd.state, JSON.stringify(state, null, 2), 'utf8');
  }).catch(reason => {
    console.error(`failed because: ${reason}`);
    process.exit(1);
  });
}
