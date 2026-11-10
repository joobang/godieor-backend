import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { CollectionRepository } from "../collection/collection.repository";

@Module({ imports: [DatabaseModule], providers: [CollectionRepository], exports: [CollectionRepository] })
export class ReviewedCatalogModule {}
