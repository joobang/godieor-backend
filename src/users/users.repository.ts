import { Injectable, ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { Prisma, category, ott_service, game_device } from "../generated/prisma/client";
export { category, ott_service, game_device };
export type SettingsInput = {expectedVersion:string;country:string;timeZone:string;enabledCategories:category[];services:ott_service[];devices:game_device[];view:string};
@Injectable()
export class UsersRepository {
  constructor(private readonly db: PrismaService) {}
  async user(id:string) {
    const user=await this.db.app_user.findUniqueOrThrow({where:{id}});
    return {id:user.id,displayName:user.display_name};
  }
  private async readSettings(db:Pick<Prisma.TransactionClient,"user_settings">,id:string) {
    const s=await db.user_settings.findUniqueOrThrow({where:{user_id:id},include:{user_enabled_category:true,user_service_filter:true,user_device_filter:true}});
    return {version:String(s.version),country:s.country,timeZone:s.time_zone,enabledCategories:s.user_enabled_category.map(v=>v.category),services:s.user_service_filter.map(v=>v.service),devices:s.user_device_filter.map(v=>v.device),view:s.view_mode};
  }
  async settings(id:string) {
    return this.db.$transaction(tx=>this.readSettings(tx,id),{isolationLevel:"RepeatableRead"});
  }
  async replaceSettings(id:string,input:SettingsInput) {
    return this.db.$transaction(async tx => {
      const result=await tx.user_settings.updateMany({where:{user_id:id,version:BigInt(input.expectedVersion)},data:{version:{increment:1},country:input.country,time_zone:input.timeZone,view_mode:input.view,updated_at:new Date()}});
      if (!result.count) throw new ConflictException({code:"SETTINGS_CONFLICT",message:"설정이 다른 기기에서 변경되었습니다."});
      await tx.user_enabled_category.deleteMany({where:{user_id:id}});
      await tx.user_service_filter.deleteMany({where:{user_id:id}});
      await tx.user_device_filter.deleteMany({where:{user_id:id}});
      if(input.enabledCategories.length) await tx.user_enabled_category.createMany({data:input.enabledCategories.map(category=>({user_id:id,category}))});
      if(input.services.length) await tx.user_service_filter.createMany({data:input.services.map(service=>({user_id:id,service}))});
      if(input.devices.length) await tx.user_device_filter.createMany({data:input.devices.map(device=>({user_id:id,device}))});
      return this.readSettings(tx,id);
    });
  }
  async favorites(id:string) {
    return this.db.$transaction(async tx=>{
      const contents=await tx.content_favorite.findMany({where:{user_id:id},orderBy:{saved_at:"desc"}});
      const events=await tx.event_favorite.findMany({where:{user_id:id},orderBy:{saved_at:"desc"}});
      const user=await tx.app_user.findUniqueOrThrow({where:{id}});
      const items=[...contents.map(v=>({targetType:"content",targetId:v.content_id,savedAt:v.saved_at.toISOString()})),...events.map(v=>({targetType:"event",targetId:v.event_id,savedAt:v.saved_at.toISOString()}))];
      items.sort((a,b)=>b.savedAt.localeCompare(a.savedAt)||a.targetId.localeCompare(b.targetId));
      return {favoritesVersion:String(user.favorites_version),items,nextCursor:null};
    },{isolationLevel:"RepeatableRead"});
  }
  async favorite(id:string,type:"content"|"event",targetId:string,save:boolean) {
    await this.db.$transaction(async tx=>{
      if(save) {
        const exists=type==="content" ? await tx.content.findUnique({where:{id:targetId}}) : await tx.event.findUnique({where:{id:targetId}});
        if(!exists) throw new NotFoundException({code:"NOT_FOUND",message:"찜 대상을 찾을 수 없습니다."});
      }
      let changed=false;
      if(type==="content") {
        if(save) { const r=await tx.content_favorite.createMany({data:[{user_id:id,content_id:targetId}],skipDuplicates:true});changed=r.count>0; }
        else {const r=await tx.content_favorite.deleteMany({where:{user_id:id,content_id:targetId}});changed=r.count>0;}
      } else {
        if(save) {const r=await tx.event_favorite.createMany({data:[{user_id:id,event_id:targetId}],skipDuplicates:true});changed=r.count>0;}
        else {const r=await tx.event_favorite.deleteMany({where:{user_id:id,event_id:targetId}});changed=r.count>0;}
      }
      if(changed) await tx.app_user.update({where:{id},data:{favorites_version:{increment:1}}});
    });
  }
}
