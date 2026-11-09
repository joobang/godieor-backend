import { Injectable } from "@nestjs/common";
import { HealthRepository } from "./health.repository";
@Injectable()
export class HealthService {
  constructor(private readonly repository: HealthRepository) {}
  async health() {
    const groups = await this.repository.checkConnection();
    const provider = groups.some(
      (g) => g.origin === "provider" && g._count > 0,
    );
    const fixture = groups.some((g) => g.origin === "fixture" && g._count > 0);
    return {
      status: "ok",
      database: "connected",
      dataMode: provider
        ? fixture
          ? "mixed"
          : "provider"
        : fixture
          ? "fixture"
          : "empty",
      realProvidersConnected: provider,
    };
  }
}
