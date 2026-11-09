import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
@Injectable()
export class HealthRepository {
  constructor(private readonly prisma: PrismaService) {}
  async checkConnection(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }
}
