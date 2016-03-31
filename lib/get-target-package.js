"use strict";

/*
 Return a parsed version of package.json found in the target path.
*/
var minimist = require('minimist'),
    path = require('path');

var pkgInfo;

// use minimist to determine our target path
var parsedArgs = minimist(process.argv.slice(2), {
      boolean: ["noRcFiles"]
    }),
    targetPath = parsedArgs.path || process.cwd();

module.exports = function () {

  // we cache the results of this function to avoid repeatedly hitting the
  // file system.
  if(pkgInfo) {
    return pkgInfo;
  }

  // get our target path's package.json, if possible
  var pkg;
  try {
    // might consider using require.resolve() to search up the directory
    // tree, if needed.
    pkg = require( path.join( path.dirname(targetPath), 'package.json' ) );
  } catch (e) {
    pkg = {};
  }

  pkgInfo = {
    pkg: pkg,
    args: parsedArgs
    path: targetPath
  };

  return pkgInfo;
}
