"use strict";

/*
 Export a function that takes an id and returns a stream wrapping the standard
 out of a scripts[command] (as run by `npm run 'command'`) in a vinyl file
 object and pushing it to a stream - unless the command already passes us vinyl
 files.
*/

var getTargetPackage = require('../get-target-package.js'),
    through = require('through2');

module.exports = function (script_id, trigger_only) {
  var pkgInfo = getTargetPackage(),
      targetPath = pkgInfo.path,
      pkg = pkgInfo.pkg,
      scripts = pkg.scripts || {},
      stream,
      cmd = scripts[script_id];

  if (!cmd) {
    throw new Error("Cannot find script dependency " + script_id);
  }

  /*
  https://nodejs.org/api/child_process.html#child_process_child_send_message_sendhandle_options_callback
  Sippy-cup cli's will look for process.send() and use it to pass along Vinyl file objects, along with
  their buffers or file handles. This should let us effectively pass the Vinyl file objects between
  processes.
  */
  // null means to use the default setting (pipe) for that fd
  var pipes = [],
      options = { stdio: [null, null, null] },
      args = [ /* ... */ ];

  // We don't know how many vinyl file objects our child process will pass along
  // so we set up 16 pipes on the stdio object and vinyl files from the child
  // process will queue up waiting for a pipe to be available.
  // Using 16 because that matches the default high water mark for object streams.
  if(!trigger_only){
    for(var i = 0; i< 16; i++){
      pipes.push('pipe');
    }
  }
  options.stdio = options.stdio.concat(pipes);
  var child = child_process.spawn(cmd, args, options);

  stream = through.obj(function(file, enc, done){
    // nothing is expected to come through this function
    return done(file);
  }, function waitForFilesFromChild (finished){
    child.on('message', function () {
      // push all the files that come from child.message();
      
    });

    // when the child process ends, it's stdout will end and we
    // know we have everything that it is going to send.
    child.sdtout.on('end', function(){
      finished();
    });
  });

  return stream;
};
