import { Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserDec } from '../user/user.decorator';
import { IProfileRO } from './profile.interface';
import { ProfileService } from './profile.service';

@ApiBearerAuth()
@ApiTags('profiles')
@Controller('profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get(':username')
  async getProfile(@UserDec('id') userId: number, @Param('username') username: string): Promise<IProfileRO> {
    return this.profileService.findProfile(userId, username);
  }

  @Post(':username/follow')
  @HttpCode(200)
  async follow(@UserDec('email') email: string, @Param('username') username: string): Promise<IProfileRO> {
    return this.profileService.follow(email, username);
  }

  @Delete(':username/follow')
  async unFollow(@UserDec('id') userId: number, @Param('username') username: string): Promise<IProfileRO> {
    return this.profileService.unFollow(userId, username);
  }
}
