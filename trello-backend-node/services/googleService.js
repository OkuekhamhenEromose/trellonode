// services/googleService.js
const { OAuth2Client } = require('google-auth-library');
const authService = require('./authService');

class GoogleService {
  constructor() {
    console.log('🔑 GoogleService initializing...');
    
    // Check for credentials
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const backendUrl = process.env.BACKEND_URL;

    if (!clientId || !clientSecret) {
      console.warn('⚠️ Google OAuth credentials not found!');
      console.warn('  Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env');
    }

    if (!backendUrl) {
      console.warn('⚠️ BACKEND_URL not set!');
      console.warn('  Add BACKEND_URL to .env');
    }

    this.client = new OAuth2Client(
      clientId,
      clientSecret,
      `${backendUrl || 'http://localhost:5000'}/api/auth/google/callback`
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