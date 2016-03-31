"use strict";

/*
 Return a parsed version of package.json found in the target path.
*/
var minimist = require('minimist'),
    path = require('path');

var pkgObjs = {};

module.exports = function (args) {
  // use minimist to determine our target path
  var parsedArgs = minimist(args || process.argv.slice(2), {
        boolean: ["noRcFiles"]
      }),
      targetPath = parsedArgs.path || process.cwd();

  // we cache the results of searching for package.json to avoid
  // repeatedly hitting the file system.

  // get our target path's package.json, if possible
  var pkg = pkgObjs[targetPath];
  if(!pkg){
    try {
      // might consider using require.resolve() to search up the directory
      // tree, if needed.
      pkg = require( path.join( path.dirname(targetPath), 'package.json' ) );
    } catch (e) {
      pkg = {};
    }
    pkgObjs[targetPath] = pkg;
  }

  return {
    pkg: pkg,
    args: parsedArgs
    path: targetPath
  };
}
