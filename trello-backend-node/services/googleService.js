const { OAuth2Client } = require('google-auth-library');
const authService = require('./authService');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

class GoogleService {
  getAuthUrl() {
    return client.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email'],
      prompt: 'consent'
    });
  }

  async handleCallback(code, deviceInfo = {}) {
    const { tokens } = await client.getToken(code);
    
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    
    const profile = {
      id: payload.sub,
      email: payload.email,
      displayName: payload.name,
      name: {
        givenName: payload.given_name,
        familyName: payload.family_name
      },
      photos: payload.picture ? [{ value: payload.picture }] : []
    };

    return await authService.handleGoogleAuth(profile, deviceInfo);
  }
}

module.exports = new GoogleService();