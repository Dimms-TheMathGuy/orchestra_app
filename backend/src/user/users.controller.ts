import { Controller, Get, Patch, Body, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {

  constructor(private usersService:UsersService){}

  @Get(':id')
  getUser(@Param('id') id:string){
    return this.usersService.getUser(id)
  }

  @Patch(':id')
  updateUser(@Param('id') id:string,@Body() body:any){
    return this.usersService.updateUser(id,body)
  }

}