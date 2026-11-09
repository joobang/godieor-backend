import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, lstat } from "node:fs/promises";
import { join } from "node:path";
import { decodeState, State } from "./domain/candidate";

export const CANDIDATE_DIRECTORY = "CANDIDATE_DIRECTORY";
@Injectable()
export class OttCandidatesRepository {
  constructor(
    @Inject(CANDIDATE_DIRECTORY) private readonly directory: string,
  ) {}
  async readInput(filename: string): Promise<unknown> {
    return JSON.parse(await readFile(filename, "utf8"));
  }
  private async loadState(): Promise<{ state: State; upgraded: boolean }> {
    let raw: string;
    try {
      raw = await readFile(join(this.directory, "state.json"), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return {
          state: {
            version: 2,
            stage: "candidate-not-published",
            candidates: [],
            attempts: {},
          },
          upgraded: false,
        };
      throw error;
    }
    return decodeState(JSON.parse(raw));
  }
  async readState(): Promise<State> {
    return (await this.loadState()).state;
  }
  async atomicWrite(
    filename: "state.json" | "reviewed.json",
    value: unknown,
  ): Promise<void> {
    const directory = this.directory;
    const target = join(directory, filename);
    try {
      if ((await lstat(target)).isSymbolicLink())
        throw new Error("SYMLINK_TARGET");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    const temporary = target + "." + randomUUID() + ".tmp";
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(JSON.stringify(value, null, 2) + "\n");
      await handle.sync();
    } finally {
      await handle.close();
    }
    try {
      await rename(temporary, target);
    } catch (error) {
      await unlink(temporary).catch(() => {});
      throw error;
    }
  }
  private async invalidateExport(): Promise<void> {
    const directory = this.directory;
    try {
      await unlink(join(directory, "reviewed.json"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  async transaction<T>(
    action: (state: State) => Promise<T>,
    invalidatesExport = true,
  ): Promise<T> {
    await mkdir(this.directory, { recursive: true });
    if ((await lstat(this.directory)).isSymbolicLink())
      throw new Error("SYMLINK_DIRECTORY");
    const lockPath = join(this.directory, "writer.lock");
    const lock = await open(lockPath, "wx", 0o600);
    try {
      const { state, upgraded } = await this.loadState();
      if (invalidatesExport || upgraded) await this.invalidateExport();
      const result = await action(state);
      await this.atomicWrite("state.json", state);
      return result;
    } finally {
      await lock.close();
      await unlink(lockPath);
    }
  }
  async writeExport(candidates: unknown[], now: string): Promise<void> {
    await this.atomicWrite("reviewed.json", {
      stage: "reviewed-candidate-not-published",
      generatedAt: now,
      candidates,
      published: 0,
    });
  }
}
