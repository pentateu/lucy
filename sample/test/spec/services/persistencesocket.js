'use strict';

describe('Service: Persistencesocket', function () {

  // load the service's module
  beforeEach(module('splitMyBillApp'));

  // instantiate service
  var Persistencesocket;
  beforeEach(inject(function (_Persistencesocket_) {
    Persistencesocket = _Persistencesocket_;
  }));

  it('should do something', function () {
    expect(!!Persistencesocket).toBe(true);
  });

});
