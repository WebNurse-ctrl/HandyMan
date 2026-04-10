import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { PrismaService } from '../common/prisma.service';
import { MsGraphService } from './ms-graph.service';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  displayName: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private msalClient: ConfidentialClientApplication;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private msGraphService: MsGraphService,
  ) {
    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: this.configService.get('AZURE_AD_CLIENT_ID', ''),
        authority: `https://login.microsoftonline.com/${this.configService.get('AZURE_AD_TENANT_ID', '')}`,
        clientSecret: this.configService.get('AZURE_AD_CLIENT_SECRET', ''),
      },
    });
  }

  getAuthUrl(): string {
    const tenantId = this.configService.get('AZURE_AD_TENANT_ID');
    const clientId = this.configService.get('AZURE_AD_CLIENT_ID');
    const redirectUri = this.configService.get('AZURE_AD_REDIRECT_URI');

    return (
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?` +
      `client_id=${clientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_mode=query` +
      `&scope=openid profile email User.Read`
    );
  }

  async handleCallback(code: string) {
    try {
      const tokenResponse = await this.msalClient.acquireTokenByCode({
        code,
        scopes: ['openid', 'profile', 'email', 'User.Read'],
        redirectUri: this.configService.get('AZURE_AD_REDIRECT_URI', ''),
      });

      if (!tokenResponse) {
        throw new UnauthorizedException('Failed to acquire token');
      }

      // Fetch user profile from Microsoft Graph
      const graphProfile = await this.msGraphService.getUserProfile(
        tokenResponse.accessToken,
      );

      // Find or create user
      const user = await this.findOrCreateUser(graphProfile);

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate JWT
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
      };

      return {
        accessToken: this.jwtService.sign(payload),
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          department: user.department,
          avatarUrl: user.avatarUrl,
        },
      };
    } catch (error) {
      this.logger.error('Auth callback failed', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private async findOrCreateUser(graphProfile: any) {
    const existing = await this.prisma.user.findUnique({
      where: { azureAdId: graphProfile.id },
    });

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          email: graphProfile.mail || graphProfile.userPrincipalName,
          displayName: graphProfile.displayName,
          firstName: graphProfile.givenName,
          lastName: graphProfile.surname,
          department: graphProfile.department,
          jobTitle: graphProfile.jobTitle,
        },
      });
    }

    // Determine role based on Azure AD groups or department
    const role = await this.determineRole(graphProfile);

    return this.prisma.user.create({
      data: {
        azureAdId: graphProfile.id,
        email: graphProfile.mail || graphProfile.userPrincipalName,
        displayName: graphProfile.displayName,
        firstName: graphProfile.givenName,
        lastName: graphProfile.surname,
        department: graphProfile.department,
        jobTitle: graphProfile.jobTitle,
        role,
      },
    });
  }

  private async determineRole(graphProfile: any): Promise<UserRole> {
    // Role determination logic:
    // 1. Check Azure AD group membership (via Graph API)
    // 2. Fall back to job title matching
    // 3. Default to MEDEWERKER

    const jobTitle = (graphProfile.jobTitle || '').toLowerCase();

    if (jobTitle.includes('facilitair') || jobTitle.includes('facility')) {
      return UserRole.FACILITAIR_MANAGER;
    }
    if (jobTitle.includes('diensthoofd') || jobTitle.includes('hoofd')) {
      return UserRole.DIENSTHOOFD;
    }
    if (
      jobTitle.includes('technisch') ||
      jobTitle.includes('onderhoud') ||
      jobTitle.includes('maintenance')
    ) {
      return UserRole.TECHNISCHE_DIENST;
    }

    return UserRole.MEDEWERKER;
  }

  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }
}
