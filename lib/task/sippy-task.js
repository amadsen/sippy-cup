"use strict";

/*
 Implementation of sippy.task();
*/

var extend = require('deep-extend'),
    merge = require('merge-stream'),
    through = require('through2'),
    passthroughFiles = require('../passthrough-files.js'),
    TaskStream = require('./task-stream.js'),
    streamPkgRunScript = require('./stream-pkg-run-script.js'),
    getCallingFnInfo = require('../get-calling-fn-info.js'),
    sippy = require('../index.js'),
    resolveConfig = require('../resolve-config.js'),
    getFromConfig = resolveConfig({});

module.exports = sippyTask;
sippyTask.fromStackTrace = findSippyTaskFromStackTrace;

var tasks = {},
    tasksByFile = {};

function sippyTask (taskName, taskFn, taskDefaults) {
  // figure out which module called .task(). Use calling module to
  // namespace stuff that needs namespaces.
  var callingFnInfo = getCallingFnInfo(sippy.task),
      callingFile = callingFnInfo.file,
      taskInfo,
      taskStream,
      taskCfg;

  // When a task name is not specified, we are setting the defualt
  // task for the file.
  if("string" !== typeof taskName){
    taskDefaults = taskFn;
    taskFn = taskName;
    taskName = "default";
  }

  tasksByFile[callingFile] = tasksByFile[callingFile] || {};
  if (tasksByFile[callingFile][taskName]) {
    throw new Error(callingFile + " already has a " + taskName + " task!");
  }

/*
 We're doing this wrong... may need to adjust the resolveConfig module.
*/
  taskCfg = getFromConfig(null, taskName);
  taskCfg = extend({}, taskDefaults, taskCfg, taskCfg[taskName]);
  taskCfg.noRcFiles = true;
  taskDefaults = taskDefaults || {};

  taskInfo = {
    file: callingFile,
    name: taskName,
    fn: taskFn,
    cfg: resolveConfig( taskCfg, taskName))
  };

  // create a through stream for the task
  taskStream = new TaskStream(taskFn);

  tasksByFile[callingFile][taskName] = taskStream
  // set the task in the general task lookup map too, if something with that
  // name has not already been set.
  tasks[taskName] = tasks[taskName] || tasksByFile[callingFile][taskName];

  // TODO: bind .src(), .dest(), .get(), and .require() to both the function and
  // the stream.
  taskStream.src = taskFn.src = sippy.src.bind(taskFn);

  taskStream.dest = taskFn.dest = sippy.dest.bind(taskFn);

  taskStream.get = taskFn.get = taskInterface.get.bind(taskFn, taskInfo);

  taskStream.require = taskFn.require = taskInterface.require.bind(taskFn, taskInfo);

  return taskStream;
}

// TODO: make this jive with index.js' .src() and .dest()
var taskInterface = {
  get: function (taskInfo, keypath) {
    return taskInfo.cfg(keypath);
  },
  // task.require("npm script or module name", "internal task") should return a
  // vinyl stream one way or another. Either stdout is a vinyl stream or we return
  // an object stream that wil emit a single data event with a Vinyl file in
  // stream mode with contents set to stdout.
  // 1. look fist in process.mainModule's (or probabaly preferably, the target
  // path's) package.json scripts. If that fails, then
  // try to require it. "internal task" is a task set by the module that isn't
  // it's default task. Consider namespace collisions here.
  // need to see if stdout can be in object mode - I doubt it - so we may have to
  // do some cheating to try to run other npm scripts in the same process.
  require: function (taskInfo, id, trigger_only) {
    // TODO: implement streamPkgRunScript and get package!!!
    return tasksByFile[taskInfo.file][id] || tasks[id] || streamPkgRunScript(id, trigger_only);
  }
};

function findSippyTaskFromStackTrace(called_fn){
  var callingFnInfo = getCallingFnInfo(called_fn),
      callingFile = callingFnInfo.file;
}
