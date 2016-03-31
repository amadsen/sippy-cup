"use strict";

/*
 A DuplexStream subclass for starting tasks.
*/

var gulplog = require('gulplog'),
    merge = require('merge-stream'),
    through = require('through2'),
    passthroughFiles = require('../passthrough-files.js');

module.exports = taskStream;

function taskStream( taskFn ){
  if('function' != typeof taskFn){
    throw new TypeError("taskStream requires a task function!");
  }

  var taskThroughStream = through({objectMode: true}, passthroughFiles,
     function delayEndUntilTaskFinished(finish) {
       if(this._taskFnComplete){
         return finish();
       }
       this.on('taskFnComplete', function(){
         finish();
       });
     }
  );

  // implement _read to run the task function and push the result, as well as
  // pass through files from _write. We're essentially a transform stream, but
  // using the invocation of _read to trigger the task function as well.
  var originalRead = taskThroughStream._read;
  taskThroughStream._read = function(){
    var args = [].slice.call(arguments),
        taskArgs = [],
        theThroughStream = this,
        taskResult;
    if (!theThroughStream._taskFnStarted) {
      theThroughStream.taskFnStarted = true;
      theThroughStream.emit('taskFnStarted');

      // run the taskFn

      function taskFnDone(err){
        if(err){
          theThroughStream.emit('error', err);
          // cleanup
          return;
        }
        if(arguments.length > 1){
          theThroughStream.push([].slice.call(arguments, 1));
        }
        theThroughStream.emit('taskFnComplete');
        return;
      }

      if(taskFn.length){
        // taskFn accepts a callback - pass it in and wait for it
        taskArgs.push( taskFnDone );
      }

      taskResult = taskFn.apply(taskFn, taskArgs);
      if( undefined !== taskResult ){
        if( 'function' === typeof taskResult.pipe ){
          // result is a stream, pipe it on to any dependent tasks.
          taskResult.pipe(theThroughStream);
        } else if( 'function' === typeof taskResult.then ){
          taskResult.then( function(value){
            taskFnDone(value);
          });
        }
      }

      if(!taskFn.length) {
        if(!taskResult){
          gulplog.warn("Task function "+ taskFn.name +" did not take a callback and returned an undefined result!");
          taskFnDone();
        } else {
          // TODO: seriously consider whether or how we should push non-vinyl file results
          return taskFnDone(null, taskResult);
        }
      }
    }
    originalRead.apply(this, args);
  };
}





// implement _write to pass files through unchanged
