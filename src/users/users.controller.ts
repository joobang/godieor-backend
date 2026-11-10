import { Controller,Get,Put,Delete,Body,Headers,Param,Header,HttpCode,Query } from "@nestjs/common";
import { UsersService } from "./users.service";
@Controller("me")
export class UsersController {
  constructor(private readonly service:UsersService) {}
  @Get() @Header("Cache-Control","no-store") user(@Headers("authorization") auth?:string){return this.service.user(auth);}
  @Get("settings") @Header("Cache-Control","no-store") settings(@Headers("authorization") auth?:string){return this.service.settings(auth);}
  @Put("settings") @Header("Cache-Control","no-store") settingsPut(@Headers("authorization") auth:string|undefined,@Body() body:unknown){return this.service.replace(auth,body);}
  @Get("favorites") @Header("Cache-Control","no-store") favorites(@Headers("authorization") auth:string|undefined,@Query() query:unknown){return this.service.favorites(auth,query);}
  @Put("favorites/contents/:id") @HttpCode(204) @Header("Cache-Control","no-store") saveContent(@Headers("authorization") auth:string|undefined,@Param("id") id:string){return this.service.favorite(auth,"content",id,true);}
  @Delete("favorites/contents/:id") @HttpCode(204) @Header("Cache-Control","no-store") deleteContent(@Headers("authorization") auth:string|undefined,@Param("id") id:string){return this.service.favorite(auth,"content",id,false);}
  @Put("favorites/events/:id") @HttpCode(204) @Header("Cache-Control","no-store") saveEvent(@Headers("authorization") auth:string|undefined,@Param("id") id:string){return this.service.favorite(auth,"event",id,true);}
  @Delete("favorites/events/:id") @HttpCode(204) @Header("Cache-Control","no-store") deleteEvent(@Headers("authorization") auth:string|undefined,@Param("id") id:string){return this.service.favorite(auth,"event",id,false);}
}
