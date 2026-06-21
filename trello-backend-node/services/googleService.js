// services/googleService.js - UPDATED

const { OAuth2Client } = require('google-auth-library');
const authService = require('./authService');

class GoogleService {
  constructor() {
    console.log('🔑 GoogleService initializing...');
    
    // ✅ Check for credentials
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.warn('⚠️ Google OAuth credentials not found!');
      console.warn('  Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env');
    }

    this.client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.BACKEND_URL}/api/auth/google/callback`
    );
    
    console.log('✅ GoogleService initialized');
  }

  getAuthUrl() {
    console.log('🔗 Generating Google OAuth URL...');
    const url = this.client.generateAuthUrl({
      access_type: 'offline',
      scope: ['profile', 'email'],
      prompt: 'consent'
    });
    console.log('✅ Google OAuth URL generated');
    return url;
  }

  async handleCallback(code, deviceInfo = {}) {
    console.log('🔄 Handling Google OAuth callback...');
    
    try {
      const { tokens } = await this.client.getToken(code);
      console.log('✅ Tokens received from Google');
      
      // Verify the token
      const ticket = await this.client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      
      const payload = ticket.getPayload();
      console.log('✅ Google user verified:', payload.email);
      
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
      
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error.message);
      throw error;
    }
  }

  async verifyToken(idToken) {
    console.log('🔍 Verifying Google ID token...');
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
      console.log('✅ Token verified');
      return ticket.getPayload();
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      throw error;
    }
  }
}

module.exports = new GoogleService();