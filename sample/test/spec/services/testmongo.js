'use strict';

describe('Service: Testmongo', function () {

  // load the service's module
  beforeEach(module('splitMyBillApp'));

  // instantiate service
  var Testmongo;
  beforeEach(inject(function (_Testmongo_) {
    Testmongo = _Testmongo_;
  }));

  it('should do something', function () {
    expect(!!Testmongo).toBe(true);
  });

});
