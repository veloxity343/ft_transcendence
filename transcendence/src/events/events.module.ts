import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EventsGateway } from './events/events.gateway';
import { ConnectionService } from './connection/connection.service';

@Module({
  imports: [JwtModule.register({})],
  providers: [EventsGateway, ConnectionService],
  exports: [EventsGateway, ConnectionService],
})
export class EventsModule {}
