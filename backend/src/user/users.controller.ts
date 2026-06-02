import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {

  constructor(private usersService:UsersService){}

  @Get()
  searchUsers(@Query('email') email?: string){
    return this.usersService.searchUsersByEmail(email)
  }

  @Get(':id')
  getUser(@Param('id') id:string){
    return this.usersService.getUser(id)
  }

  @Patch(':id')
  updateUser(@Param('id') id:string,@Body() body:any){
    return this.usersService.updateUser(id,body)
  }

}
