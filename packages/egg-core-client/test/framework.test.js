'use strict';

const mock = require('egg-mock');

describe('test/framework.test.js', () => {
  let app;
  before(() => {
    app = mock.app({
      baseDir: 'example',
      framework: true,
    });
    return app.ready();
  });

  after(() => app && app.close());

  afterEach(mock.restore);

  it('should GET /api', async () => {
    return app.httpRequest()
      .get('/api')
      .expect('framework-example_123456')
      .expect(200);
  });
});

