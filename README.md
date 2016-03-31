## Sippy-cup
### Don't gulp, sip!

Sippy-cup is intended to allow you to use [gulp](https://www.npmjs.com/package/gulp) plugins to write `gulp.task()`-like command line scripts that you can run via `npm run-script <script>` or directly with a hashbang (`#!/usr/bin/env node`). [Vinyl](https://github.com/gulpjs/vinyl), Gulp's [file streaming interface](https://www.npmjs.com/package/vinyl-fs) is extremely simple and powerful. There are gulp plugins that can be chained together to accomplish a wide variety of tasks. On the other hand, I'd rather not have a `gulpfile.js` cluttering up my project root just to define tasks; not when I already have `npm scripts`.

Also, while Gulp tasks can depend on other gulp tasks, they don't pass on their streams or promises to their dependent tasks. This can make some workflows hard to describe in a gulpfile. Sippy-cup aims to address this as well by making any non-`pre-` or `post-` npm script a task that returns a Vinyl stream. It does this by wrapping the standard output of npm scripts that are not already providing a Vinyl stream in a Vinyl File in streaming mode that is emitted as a single `data` event on a stream in object mode. This makes managing dependencies and the order of task execution a matter of listening for the right event(s) - or not listening at all. Accordingly, the [stream-series](https://www.npmjs.com/package/stream-series) and [merge-stream](https://www.npmjs.com/package/merge-stream) modules are useful for managing task flow, so we provide them as `sippy.series()` and `sippy.parallel()`.

In other words, Sippy-cup is intended to take the goodness of gulp and make it a bit less messy.

## Usage
Sippy-cup is for building command line scripts and running them via `npm run-script <script>`. As such, using Sippy-cup starts with writing a node module with a hashbang. Something like this

##### example.js
~~~javascript
#!/usr/bin/env node
"use strict";

var sippy = require('sippy-cup'),
	concat = require('gulp.concat'),
	dependency = sippy.require('depend-on-this');

sippy.defaults({
	out: "outfile.txt",
	dest: "../logs/"
});

module.exports = sippy.task( function task(done) {
	// calling `dependency.pipe()` is what
	// makes it a dependency. Our task will wait
	// for `data` events from `dependency`.
	return dependency
		.pipe( concat( task.get('out') )
		// calling task.dest() without parameters
		// makes an implicit call to `task.get('dest')`
		.pipe( task.dest() );
});
~~~

Sippy-cup also provides [merge-stream](https://www.npmjs.com/package/merge-stream) and [stream-series](https://www.npmjs.com/package/stream-series) as `sippy.parallel()` and `sippy.series()` respectively. This allows managing the execution order of task dependencies - which may be passed in as streams or as task names which will be resolved internally with `sippy.require()`. Sippy-cup also allows simply triggering dependencies without recieving their vinyl output using `sippy.trigger()`, which will otherwise behave like `sippy.parallel()`.

##### ordered-example.js
~~~javascript
#!/usr/bin/env node
"use strict";

var sippy = require('sippy-cup'),
	concat = require('gulp.concat');

sippy.defaults({
	"red-task":{
		src: "**/red-*.js"
	},
	"green-task":{
		src: "**/green-*.js"
	},
	"blue-task":{
		src: "**/blue-*.js"
	},
	out: "outfile.txt",
	dest: "../logs/"
});

// sippy allows defining named internal tasks. 
// They are namespaced by the file they are defined
// in. Only one task of a given name is allowed within
// a given filename namespace.
var named = sippy.task('named-task', function(task){
	// ...
});

var red = sippy.task('red-task', function(){
	// Calling `sippy.src()` without parameters
	// makes an implicit call to `sippy.get('src')`,
	// which will prefer task specific configuration
	// to more generic configuration.
	// This is less reliable and performant than calling
	// one of the `<task>.src()` variants because it relies
	// on generating a stack trace. It exists only as a 
	// concession to the original gulp API.
	return sippy.src();
});

var green = sippy.task('green-task', function greenFn(){
	// sippy adds `.src()`, `.dest()`, and `.get()`, as
	// methods on all task functions. If you name your task
	// function you can call it's `.src()`, etc. rather 
	// than the global `sippy` versions.

	// Calling `green.src()` without parameters
	// makes an implicit call to `green.get('src')`,
	// which will prefer task specific configuration
	// to more generic configuration.
	return greenFn.src();
});

var blue = sippy.task('blue-task', function(){
	// sippy tasks are called with the task
	// function itself set as the value of `this`, so
	// even if you passed an anonymous function you can 
	// use the `fn.src()` syntax.
	var blueFn = this;
	return blueFn.src();
});

var task = sippy.task( function(){
	return sippy.series(
		'depend-on-this',
		 sippy.parallel(
		 	red, green, "blue-task"
		 )
	)
		.pipe( concat( task.get('out') )
	// `.src()`, `.dest()`, and `.get()`, are also added as
	// methods on all task streams as well.
		.pipe( task.dest() );
});

module.exports = task;
~~~

Because Sippy-cup tasks are command line scripts it is often useful for them to take configuration. Sippy-cup uses the [minimist](https://github.com/substack/minimist) and [rc](https://www.npmjs.com/package/rc) modules to provide command line argument and `.<script name>rc`-file configuration resolution. Aditionally, Sippy-cup scripts will look in `package.json` in the target directory (current working directory by default) for a configuration object under a `<script name>rc` key within the `config` object (TBD.) This is to allow the user to avoid cluttering their project with extra configuration files. Scripts should provide any default configuration by calling `sippy.defaults()` during module initialization.

##### example.js
~~~javascript
#!/usr/bin/env node
"use strict";

var sippy = require('sippy-cup'),
	concat = require('gulp.concat'),
	dependency = sippy.require('depend-on-this');

sippy.defaults({
	out: "outfile.txt",
	dest: "../logs/"
});

module.exports = sippy.task( function (){
	var task = this;
	return dependency
		.pipe( concat( task.get('out') )
		.pipe( task.dest() );
});
~~~

##### package.json
~~~javascript
{
 "name": "example-sippy-user",
 ...
 "config": {
 	"examplerc": {
 		"dest": "../put/logs/here/instead/"
 	}
 }
 ...
}
~~~

##### .examplerc
~~~javascript
{
	"out": "outfile-override.txt"
}
~~~