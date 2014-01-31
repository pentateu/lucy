# lucy [![Build Status](https://secure.travis-ci.org/pentateu/lucy.png?branch=master)](http://travis-ci.org/pentateu/lucy)

MongoDB over sockets made easy and fun to use.

## Getting Started

### Server
Install the server side module with: `npm install lucy`

### Client
_(Coming soon)_

```javascript
var io = require('socket.io').listen(8500),
    lucy = require('lucy');

lucy.mapCollection('person');

lucy.start(io, 'mongodb://localhost/test');
```

## Documentation
_(Coming soon)_

## Examples
_(Coming soon)_

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_

## License
Copyright (c) 2014 Rafael Almeida. Licensed under the MIT license.
