'use strict';

module.exports = function (grunt) {
  // Show elapsed time at the end
  require('time-grunt')(grunt);
  // Load all grunt tasks
  require('load-grunt-tasks')(grunt);

  // Project configuration.
  grunt.initConfig({
    nodeunit: {
      files: ['test/**/*_test.js']
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib: {
        src: ['lib/**/*.js']
      },
      test: {
        src: ['test/**/*.js']
      }
    },

    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib: {
        files: '<%= jshint.lib.src %>',
        tasks: ['jshint:lib', 'nodeunit', 'copy:local']
      },
      test: {
        files: '<%= jshint.test.src %>',
        tasks: ['jshint:test', 'nodeunit']
      }
    },

    local: {
      //where to do the locao deploy/build
      path: '../poc/node_modules/lucy'
    },

    // Copies remaining files to places other tasks can use
    copy: {
      local: {
        files: [{
          expand: true,
          dot: true,
          cwd: '.',
          dest: '<%= local.path %>',
          src: ['{,*/}*.*', '**/{,*/}*.*']
        }]
      }
    },

    // Run some tasks in parallel to speed up the build process
    /*concurrent: {
      dev: [
        ,
        ,
         
      ]
    },*/

  });

  // Default task.
  grunt.registerTask('default', ['jshint', 'copy', 'watch']);

};
