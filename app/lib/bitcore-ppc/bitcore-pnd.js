// Copyright (c) 2016 hrobeers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
// Updated for Pandacoin 2021 jommy99  John Moore
// Running this file patches bitcore-lib to work on the pandacoin blockchain.
// * Sets pandacoin as the default network.
// * Patches bitcore-lib.Transaction to include pandacoin's timestamp.

'use strict';

var bitcore = require('bitcore-lib');

//
// Set peercoin as default network
//

bitcore.Networks.add({
    name: 'pandacoin',
    alias: 'pndcoin',
    pubkeyhash: 0x37,
    privatekey: 0xb7,
    scripthash: 0x75,
    xpubkey: 0x0488b21e,
    xprivkey: 0x0488ade4,
  });

bitcore.Networks.add({
    name: 'peercoin-testnet',
    alias: 'ppcoin-test',
    pubkeyhash: 0x6f,
    privatekey: 0xef,
    scripthash: 0xc4,
    xpubkey: 0x043587cf,
    xprivkey: 0x04358394,
  });

bitcore.Networks.defaultNetwork = bitcore.Networks.get('pandacoin');


//
// Overwrite transaction serialization to include peercoin's timestamp
//

var Transaction = bitcore.Transaction;
var Input = Transaction.Input;
var Output = Transaction.Output;

var _ = require('lodash');

Transaction.prototype.toBufferWriter = function(writer) {
  writer.writeUInt32LE(this.version);

  // ppcoin: if no timestamp present, take current time (in seconds)
  var timestamp = this.timestamp ? this.timestamp : new Date().getTime()/1000;
  writer.writeUInt32LE(timestamp);

  writer.writeVarintNum(this.inputs.length);
  _.each(this.inputs, function(input) {
    input.toBufferWriter(writer);
  });
  writer.writeVarintNum(this.outputs.length);
  _.each(this.outputs, function(output) {
    output.toBufferWriter(writer);
  });
  writer.writeUInt32LE(this.nLockTime);
  return writer;
};

var checkArgument = function(condition, argumentName, message, docsPath) {
  if (!condition) {
    throw new bitcore.errors.InvalidArgument(argumentName, message, docsPath);
  }
};

Transaction.prototype.fromBufferReader = function(reader) {
  checkArgument(!reader.finished(), 'No transaction data received');
  var i, sizeTxIns, sizeTxOuts;

  this.version = reader.readUInt32LE();

  // ppcoin: deserialize timestamp
  this.timestamp = reader.readUInt32LE();

  sizeTxIns = reader.readVarintNum();
  for (i = 0; i < sizeTxIns; i++) {
    var input = Input.fromBufferReader(reader);
    this.inputs.push(input);
  }
  sizeTxOuts = reader.readVarintNum();
  for (i = 0; i < sizeTxOuts; i++) {
    this.outputs.push(Output.fromBufferReader(reader));
  }
  this.nLockTime = reader.readUInt32LE();
  return this;
};
