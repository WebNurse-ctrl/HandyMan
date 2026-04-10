import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

@Injectable()
export class MsGraphService {
  private readonly logger = new Logger(MsGraphService.name);

  constructor(private configService: ConfigService) {}

  private getClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  async getUserProfile(accessToken: string) {
    try {
      const client = this.getClient(accessToken);
      return await client
        .api('/me')
        .select(
          'id,displayName,givenName,surname,mail,userPrincipalName,department,jobTitle',
        )
        .get();
    } catch (error) {
      this.logger.error('Failed to fetch user profile from Graph API', error);
      throw error;
    }
  }

  async getUserPhoto(accessToken: string): Promise<string | null> {
    try {
      const client = this.getClient(accessToken);
      const photo = await client.api('/me/photo/$value').get();
      return photo ? `data:image/jpeg;base64,${photo.toString('base64')}` : null;
    } catch {
      return null;
    }
  }

  async getUserGroups(accessToken: string): Promise<string[]> {
    try {
      const client = this.getClient(accessToken);
      const result = await client
        .api('/me/memberOf')
        .select('id,displayName')
        .get();
      return result.value.map((group: any) => group.displayName);
    } catch (error) {
      this.logger.error('Failed to fetch user groups', error);
      return [];
    }
  }

  async sendEmail(
    accessToken: string,
    to: string,
    subject: string,
    body: string,
  ) {
    try {
      const client = this.getClient(accessToken);
      await client.api('/me/sendMail').post({
        message: {
          subject,
          body: {
            contentType: 'HTML',
            content: body,
          },
          toRecipients: [
            {
              emailAddress: { address: to },
            },
          ],
        },
      });
    } catch (error) {
      this.logger.error('Failed to send email via Graph API', error);
      throw error;
    }
  }
}
