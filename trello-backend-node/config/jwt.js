module.exports = {
  secret: process.env.JWT_SECRET || 'bf43a801052f9159769c50bba7284e368143c310b92ced0809607f1aa7476674',
  accessExpiration: '1d',
  refreshExpiration: '7d',
};