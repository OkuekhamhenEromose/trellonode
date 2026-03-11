const { OAuth2Client } = require('google-auth-library');
const authService = require('./authService');

class GoogleService {
  constructor() {
    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BACKEND_URL}/api/auth/google/callback`
    );
  }

  getAuthUrl() {
    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email'],
      prompt: 'consent'
    });
  }

  async handleCallback(code, deviceInfo = {}) {
    const { tokens } = await this.client.getToken(code);
    
    // Verify the token
    const ticket = await this.client.verifyIdToken({
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
      photos: [{ value: payload.picture }]
    };

    return await authService.handleGoogleAuth(profile, deviceInfo);
  }

  async verifyToken(idToken) {
    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    return ticket.getPayload();
  }
}

module.exports = new GoogleService();