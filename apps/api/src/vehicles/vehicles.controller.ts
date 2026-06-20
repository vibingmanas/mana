import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@mana/db';
import { VehiclesService } from './vehicles.service';
import { AddMediaDto, CreateVehicleDto, SetStatusDto, UpdateVehicleDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DEALER_OWNER)
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateVehicleDto) {
    return this.vehicles.create(user.userId, dto);
  }

  @Get()
  listMine(@CurrentUser() user: AuthUser) {
    return this.vehicles.listMine(user.userId);
  }

  @Get(':id')
  getMine(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vehicles.getMine(user.userId, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicles.update(user.userId, id, dto);
  }

  @Post(':id/verify-rc')
  @HttpCode(200)
  verifyRc(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.vehicles.verifyRc(user.userId, id, { ip, userAgent: ua });
  }

  @Post(':id/media')
  addMedia(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: AddMediaDto) {
    return this.vehicles.addMedia(user.userId, id, dto);
  }

  @Post(':id/publish')
  @HttpCode(200)
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.vehicles.publish(user.userId, id);
  }

  @Post(':id/status')
  @HttpCode(200)
  setStatus(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SetStatusDto) {
    return this.vehicles.setStatus(user.userId, id, dto.status);
  }
}
