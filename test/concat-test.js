#!/usr/bin/env node
"use strict";

var sippy = require('../index.js'),
    concat = require('gulp-concat');

function concatStream() {
  return sippy.src()
    .pipe(concat('all.js'))
    .pipe(sippy.dest());
}
