"use strict";

var getStackTrace = require('stack-trace').get;

// utility for getting the file that called a function
module.exports = function getCallingFnInfo(called_fn){
  // figure out which module called fn.
  var trace = getStackTrace(called_fn),
      callingFnInfo = {
        file: trace[0].getFileName(),
        name: trace[0].getFunctionName(),
        fn: trace[0].getFunction()
      };
  return callingFnInfo;
};
