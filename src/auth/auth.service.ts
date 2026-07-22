import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { timingSafeEqual } from 'crypto';
import { Model } from 'mongoose';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { AdminUser, AdminUserDocument } from './schemas/admin-user.schema';

const BCRYPT_ROUNDS = 12;
const TOKEN_TTL = '8h';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(AdminUser.name)
    private readonly adminModel: Model<AdminUserDocument>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async status() {
    const count = await this.adminModel.countDocuments().exec();
    return {
      hasAdmins: count > 0,
      signupOpen: count === 0,
      inviteRequired: count > 0,
    };
  }

  async signup(dto: SignupDto) {
    const email = dto.email.trim().toLowerCase();
    const existingCount = await this.adminModel.countDocuments().exec();

    if (existingCount > 0) {
      this.assertValidInvite(dto.inviteCode);
    }

    const existing = await this.adminModel.findOne({ email }).exec();
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const admin = await this.adminModel.create({
      email,
      name: dto.name.trim(),
      passwordHash,
      isActive: true,
      lastLoginAt: new Date(),
    });

    const token = await this.signToken(admin);
    return {
      success: true,
      token,
      admin: this.toSafeAdmin(admin),
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const admin = await this.adminModel.findOne({ email }).exec();
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    admin.lastLoginAt = new Date();
    await admin.save();

    const token = await this.signToken(admin);
    return {
      success: true,
      token,
      admin: this.toSafeAdmin(admin),
    };
  }

  async me(userId: string) {
    const admin = await this.adminModel.findById(userId).exec();
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Session expired');
    }
    return { admin: this.toSafeAdmin(admin) };
  }

  private async signToken(admin: AdminUserDocument) {
    return this.jwtService.signAsync(
      { sub: String(admin._id), email: admin.email },
      {
        expiresIn: TOKEN_TTL,
        secret:
          this.config.get<string>('JWT_SECRET') ||
          'dev-only-insecure-secret-change-me',
      },
    );
  }

  private assertValidInvite(inviteCode?: string) {
    const expected = this.config.get<string>('ADMIN_INVITE_CODE');
    if (!expected) {
      throw new ForbiddenException(
        'Signup is locked. Set ADMIN_INVITE_CODE or ask an existing admin.',
      );
    }
    if (!inviteCode) {
      throw new BadRequestException('Invite code is required');
    }

    const a = Buffer.from(inviteCode);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new ForbiddenException('Invalid invite code');
    }
  }

  private toSafeAdmin(admin: AdminUserDocument) {
    return {
      id: String(admin._id),
      email: admin.email,
      name: admin.name,
      lastLoginAt: admin.lastLoginAt,
    };
  }
}
