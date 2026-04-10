import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SetMetadata } from '@nestjs/common';

const Public = () => SetMetadata('isPublic', true);

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Get('login')
  @ApiOperation({ summary: 'Redirect to Microsoft login' })
  login(@Res() res: Response) {
    const authUrl = this.authService.getAuthUrl();
    res.redirect(authUrl);
  }

  @Public()
  @Get('callback')
  @ApiOperation({ summary: 'Handle Microsoft OAuth callback' })
  async callback(@Query('code') code: string, @Res() res: Response) {
    const result = await this.authService.handleCallback(code);
    const frontendUrl = this.configService.get('FRONTEND_URL');
    res.redirect(
      `${frontendUrl}/login?token=${result.accessToken}`,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @HttpCode(HttpStatus.OK)
  getProfile(@CurrentUser() user: any) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      jobTitle: user.jobTitle,
      avatarUrl: user.avatarUrl,
    };
  }
}
