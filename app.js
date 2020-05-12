'use strict'

const System = require('./lib/system');
const Messager = require('./lib/messager');

let conf = System.getConf( __dirname );
let test = System.getArgv( 'debug' );

var msg = new Messager( conf, test );
