import { Injectable } from "@nestjs/common";
import { HealthRepository } from "./health.repository";
@Injectable()
export class HealthService {
  constructor(private readonly repository: HealthRepository) {}
  async health() {
    await this.repository.checkConnection();
    return {
      status: "ok",
      database: "connected",
      dataMode: "fixture",
      realProvidersConnected: false,
    };
  }
}
