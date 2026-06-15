import { Controller, Post, Body, UnauthorizedException, BadRequestException, Get, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { UserEntity } from '../../infrastructure/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

class RegisterDto {
  email: string;
  passwordHash: string;
  fullName: string;
  role?: 'ADMIN' | 'OPERATOR' | 'CITIZEN';
}

class LoginDto {
  email: string;
  passwordHash: string; // Enviado como contraseña plana desde el cliente, mapeamos el DTO para consistencia
}

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private dataSource: DataSource,
    private jwtService: JwtService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'Usuario registrado con éxito.' })
  async register(@Body() dto: RegisterDto) {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const existing = await userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new BadRequestException('El correo ya está registrado.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.passwordHash || 'password123', salt);

    const user = userRepo.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role || 'CITIZEN',
    });

    const savedUser = await userRepo.save(user);
    const { passwordHash: _, ...result } = savedUser;
    return result;
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión y obtener tokens' })
  @ApiResponse({ status: 200, description: 'Token de acceso y Refresh Token generados.' })
  async login(@Body() dto: LoginDto) {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const user = await userRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const isMatch = await bcrypt.compare(dto.passwordHash, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1d' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refrescar token de acceso vencido' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const newAccessToken = this.jwtService.sign(
        { sub: payload.sub, email: payload.email, role: payload.role },
        { expiresIn: '1d' },
      );
      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('Refresh Token inválido o expirado.');
    }
  }
}
