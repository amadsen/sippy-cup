"use strict";

/**
Sippy-cup is intended to allow you to use gulp plugins to write `gulp.task()`-like
command line scripts that you can run via `npm run-script <script>` or directly
with a hashbang (`#!/usr/bin/env node`).
 */

var gulplog = require('gulplog'),
    series = require('stream-series'),
    merge = require('merge-stream'),
    through = require('through2'),
    path = require('path'),
    extend = require('deep-extend'),
    vinylFs = require('vinyl-fs'),
    sippyTask = require('lib/task/sippy-task.js'),
    resolveConfig = require('lib/resolve-config.js'),
    passthroughFiles = require('lib/passthrough-files.js');


var sippy = module.exports = {
  // supply stream-series as .series() and merge-stream as .parallel(), wrapped
  // with logic to resolve strings to task streams.
  series: function wrapSeries(){
    var args = [].slice.call(arguments).map( resolveToTask );
    series.apply(null, args);
  },
  parallel: function wrapMerge(){
    var args = [].slice.call(arguments).map( resolveToTask );
    merge.apply(null, args);
  },
  // .trigger() just gives you an end event when it's parameter streams are complete
  trigger: function trigger() {
    // we need to make sure series, parallel, and trigger all resolve string
    // arguments to task streams, then check to see if they are already in the
    // active dependency tree to detect circular dependencies.

    return sippy.series.apply(null, [].slice.call(arguments))
      .pipe(
        through( function(file, enc, done){
          // don't pass on anything coming through the stream
          done();
        })
      );
  },
  task: sippyTask
};

// Because we provide gulplog, anything using a recent version of gulp-util
// will emit events on the gulplog logger.
sippy.log = gulplog;

// TODO: need to get verbosity from config!!!
var verbosity = verbosity > 0 ? verbosity : 1;
[
  "error",
  "warn",
  "info",
  "debug"
].slice(0, verbosity).forEach( function setLogListener(level){
  gulplog.on(level, function(msg){
    console[level](msg);
  });
});


// sippy.src() and sippy.dest() should be a facade over vinyl-fs src() and dest()
// that get's default parameters from built up config (ie. defaults, rc,
// package.json config, ...)
['src', 'dest'].forEach( function (fnName) {
  sippy[fnName] = function () {
    var task = this,
        args = [].slice.call(arguments);
    // if no glob is provided, we'll need to figure out our current task
    if( sippy === task && !(arguments.length >= 1) ){
      task = sippyTask.fromStackTrace(sippy[fName]);
      args = task.get(fnName);
    }
    return vinylFs[fnName].apply(vinylFs, args);
  }
});

// wait for process initialization to complete, then...
setImmediate( function(){
  // disable sippy.task(), as it is too late!
  sippy.task = noop("sippy.task() must be called during module initialization! Ignoring.");

  // if process.mainModule has us as a child, trigger the default task.
  if( process.mainModule.children.indexOf(module) > -1){
    var defaultTaskStream = tasksByFile[process.mainModule.filename]["default"];
    // just tell the readable stream part of this task to go go go...
    defaultTaskStream.pipe( through(function sendFilesToParentProcess(file, enc, done){
      // if we are a child process, send each vinyl file object across the ipc
      // channel (which may require a little manipulation to pass the underlying
      // streams and/or buffers.)
      if (process.send) {
        process.send({
          cwd: file.cwd,
          base: file.base,
          path: file.path,
          history: file.history,
          stat: file.stat
        }, file.contents); // <-- I expect file.contents not to work here,
        // because I don't know if buffers have _handle.

      }
      // Just pass the file on - not that it really make a difference here
      done(file);
    }, function taskComplete(done) {
      sippy.info("%s %s task complete.", process.mainModule.filename, "default");
      done();
    }));

    // Also trying just passing on the vinyl stream. I really don't expect this to work.
    if (process.send) {
      process.send("vinyl-stream", defaultTaskStream);
    }
  }
});

// A no-operation function for disabling an API.
function noop (str) {
  return function () {
    if(str){
      sippy.log.warn(str);
    }
    return;
  }
};
