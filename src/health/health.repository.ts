import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
@Injectable()
export class HealthRepository {
  constructor(private readonly prisma: PrismaService) {}
  async checkConnection() {
    await this.prisma.catalog_state.findUniqueOrThrow({
      where: { singleton: true },
      select: { revision: true },
    });
    return this.prisma.event.groupBy({ by: ["origin"], _count: true });
  }
}
