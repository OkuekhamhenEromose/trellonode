const app = require('../app');

describe('application smoke tests', () => {
  test('Express application loads with health endpoint registered', () => {
    expect(typeof app).toBe('function');

    const stack = app._router?.stack ?? [];
    const healthRoute = stack.find((layer) => layer.route?.path === '/health');

    expect(healthRoute).toBeDefined();
    expect(healthRoute.route.methods.get).toBe(true);
  });

  test('API v1 route namespace is registered', () => {
    const stack = app._router?.stack ?? [];
    const apiRouter = stack.find((layer) => layer.regexp?.toString().includes('api\\/v1'));

    expect(apiRouter).toBeDefined();
  });
});
