"use strict";

var rc = require('rc'),
    extend = require('deep-extend'),
    path = require('path'),
    getTargetPackage = require('./get-target-package.js');

module.exports = resolveConfig;

var rc_configs = {};

function resolveConfig (defaults, rcName) {
  if (arguments.length === 1) {
    if ("string" === typeof defaults) {
      rcName = defaults;
      defaults = {};
    }
  }

  // get our target path's package.json and other info, if possible
  var pkgInfo = getTargetPackage();

  var parsedArgs = pkgInfo.args,
      targetPath = pkgInfo.path,
      pkg = pkgInfo.pkg;

  rcName = rcName || parsedArgs.name || path.basename(require.main.filename).replace(/\..*?$/, "");

  var config = {};

  // use, in order, a CLI specified name, the passed in rcName, or the
  // basename - without extension - of the script being run.
  if( !(parsedArgs.noRcFiles || defaults.noRcFiles) ) {
    // there is only one config per rcName!!
    if (rc_configs[rcName]) {
      config = rc_configs[rcName];
    } else {
      // use rc to pull in settings from rc files only - we'll merge
      // defaults and parsedArgs ourselves
      config = rc_configs[rcName] = rc(rcName, {}, {});
    }
  }

  // merge, in order, defaults, the current config from rc, config from
  // package.json, and parsedArgs.
  config = extend({}, defaults, config);
  // look for an <rcName>rc key within target path's package.json
  config = extend(config, pkg[rcName+"rc"] || {});
  // look for a config.<rcName>rc key within target path's package.json
  config = extend(config,(pkg.config||{})[rcName+"rc"] || {});
  config = extend(config, parsedArgs);

  return get.bind(config);
}


var typeHandlers = {
  'string': function(keypath) {
    return keypath.split('.');
  },
  'function': function (keypath) {
    return resolveKeyPath(keypath());
  }
  'object': function (keypath) {
    if(keypath && Array.isArray(keypath)){
      return keypath.map( function (item) {
        return resolveKeyPath(item);
      }).concat();
      // ^- concat makes a copy of the array and combines any arrays returned
      // by values in our original array.
    }
    // null is like undefined and any other Object has no meaning here
    return [];
  },
  'undefined': function () {
    return [];
  }
}

function resolveKeyPath (keypath) {
  var handler = typeHandlers[ typeof keypath ] || typeHandlers.undefined;
  return handler( keypath );
}

function get (keypath, namespace) {
  var config = this,
      key,
      value = config[namespace]? extend({}, config, config[namespace]) : extend({}, config);
  // resolveKeyPath will always return a new array!!
  keypath = resolveKeyPath( keypath );

  // As long as we have an existing value and a next key to look up,
  // look it up.
  for( key = keypath.unshift(); key && value; key = keypath.unshift() ){
    value = value[key];
  }

  return value;
}
