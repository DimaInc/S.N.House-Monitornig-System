module.exports = function( grunt ) {
  'use strict';

  grunt.loadNpmTasks('grunt-wiredep');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    
    wiredep: {
      app: {
        src: 'index.html'
      }
    }
  });

  grunt.registerTask('server', 'Start express server', function() {
    require('./server.js').listen(8080, function () {
      grunt.log.writeln('Web server running at http://localhost:8080.');
    }).on('close', this.async());
  });

  grunt.registerTask('default', ['server']);
};

 