import { BadRequestException, Injectable } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { FavoriteCursorService } from "./favorite-cursor.service";
import { COUNTRIES, TIME_ZONES } from "../common/config/catalog.constants";
import { UsersRepository,SettingsInput,category,game_device,ott_service } from "./users.repository";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Injectable()
export class UsersService {
  constructor(private readonly auth: AuthService,private readonly repo:UsersRepository,private readonly cursor:FavoriteCursorService) {}
  private async id(header?:string) {return this.auth.user(header);}
  user(header?:string){return this.id(header).then(id=>this.repo.user(id));}
  settings(header?:string){return this.id(header).then(id=>this.repo.settings(id));}
  async replace(header:string|undefined,value:unknown) {
    const v=value as Record<string,unknown>;
    const unique=(a:unknown, allowed:readonly string[])=>Array.isArray(a)&&a.length<=4&&a.every(x=>typeof x==="string"&&allowed.includes(x))&&new Set(a).size===a.length;
    if(!v||typeof v!=="object"||typeof v.expectedVersion!=="string"||!(/^[1-9]\d*$/.test(v.expectedVersion))||
      typeof v.country!=="string"||!(COUNTRIES as readonly string[]).includes(v.country)||
      typeof v.timeZone!=="string"||!TIME_ZONES.includes(v.timeZone)||
      !unique(v.enabledCategories,Object.values(category))||!unique(v.services,Object.values(ott_service))||!unique(v.devices,Object.values(game_device))||
      !["calendar","cards"].includes(String(v.view))) throw new BadRequestException({code:"INVALID_SETTINGS",message:"설정값을 확인해 주세요."});
    return this.repo.replaceSettings(await this.id(header),v as SettingsInput);
  }
  async favorites(header:string|undefined,query:unknown){const id=await this.id(header); return this.cursor.page(id,await this.repo.favorites(id),query);}
  async favorite(header:string|undefined,type:"content"|"event",targetId:string,save:boolean){
    if(!uuid.test(targetId)) throw new BadRequestException({code:"INVALID_TARGET",message:"잘못된 대상 ID"});
    await this.repo.favorite(await this.id(header),type,targetId,save);
  }
}
