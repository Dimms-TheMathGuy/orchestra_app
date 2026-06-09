import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ChatGateway } from './chat.gateway'
import { encrypt, decrypt } from '../chatencryption/encryption.service'
import { RolesService, TEAM_LABEL, MemberContext, teamForRole } from '../roles/roles.service'
import { ChannelType } from '@prisma/client'

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private chatGateway: ChatGateway,
    private roles: RolesService,
  ) {}

  private safeDecrypt(content: string, iv?: string | null) {
    try {
      if (!iv || iv.length !== 32) {
        return content
      }
      return decrypt(content, iv)
    } catch (err) {
      console.error('Decrypt failed, returning raw content')
      return content
    }
  }

  /** True if the given member context may access the channel. */
  private canAccessChannel(
    channel: { type: ChannelType; team: string | null },
    ctx: MemberContext,
  ): boolean {
    if (channel.type === 'GENERAL') return true
    // Management (PM + board) can see everything
    if (ctx.level <= 1) return true
    if (channel.type === 'MANAGEMENT') return ctx.level <= 1
    if (channel.type === 'TEAM') return ctx.team === channel.team
    return false
  }

  /**
   * Provision the channels a project should have:
   *  - GENERAL (everyone)
   *  - MANAGEMENT (PM + board)
   *  - one TEAM channel per distinct team currently represented by members
   */
  async ensureChannels(projectId: string) {
    const existing = await this.prisma.chatChannel.findMany({
      where: { projectId },
      select: { type: true, team: true },
    })

    const toCreate: Array<{ projectId: string; type: ChannelType; team: string | null; name: string }> = []

    if (!existing.some((c) => c.type === 'GENERAL')) {
      toCreate.push({ projectId, type: 'GENERAL', team: null, name: 'General' })
    }
    if (!existing.some((c) => c.type === 'MANAGEMENT')) {
      toCreate.push({ projectId, type: 'MANAGEMENT', team: null, name: 'Management' })
    }

    // Team channels — based on roles members actually hold
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { projectRole: true },
    })
    const teams = new Set<string>()
    for (const m of members) {
      const team = teamForRole(m.projectRole?.name)
      if (team) teams.add(team)
    }
    for (const team of teams) {
      if (!existing.some((c) => c.type === 'TEAM' && c.team === team)) {
        toCreate.push({ projectId, type: 'TEAM', team, name: `${TEAM_LABEL[team] ?? team} Team` })
      }
    }

    if (toCreate.length > 0) {
      await this.prisma.chatChannel.createMany({ data: toCreate, skipDuplicates: true })
    }
  }

  /** All channels the user can access, in display order. */
  async getChannels(projectId: string, userId: string) {
    // getMemberContext doubles as the access check (isMember) — no separate query.
    const ctx = await this.roles.getMemberContext(projectId, userId)
    if (!ctx.isMember) throw new ForbiddenException('Not a project member')

    await this.ensureChannels(projectId)

    const channels = await this.prisma.chatChannel.findMany({
      where: { projectId },
    })

    const order: Record<ChannelType, number> = { GENERAL: 0, MANAGEMENT: 1, TEAM: 2 }

    return channels
      .filter((c) => this.canAccessChannel(c, ctx))
      .sort((a, b) => {
        const d = order[a.type] - order[b.type]
        return d !== 0 ? d : a.name.localeCompare(b.name)
      })
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        team: c.team,
      }))
  }

  /** Resolve & authorize a channel for this user; returns the channel row. */
  private async resolveChannel(projectId: string, userId: string, channelId?: string) {
    const ctx = await this.roles.getMemberContext(projectId, userId)
    if (!ctx.isMember) throw new ForbiddenException('Not a project member')

    let channel
    if (channelId) {
      // The channel already exists (the client got its id from getChannels), so
      // skip the provisioning pass — just look it up.
      channel = await this.prisma.chatChannel.findFirst({
        where: { id: channelId, projectId },
      })
      if (!channel) throw new NotFoundException('Channel not found')
    } else {
      // Default to GENERAL — provision lazily only if this project has none yet.
      channel = await this.prisma.chatChannel.findFirst({
        where: { projectId, type: 'GENERAL' },
      })
      if (!channel) {
        await this.ensureChannels(projectId)
        channel = await this.prisma.chatChannel.findFirst({
          where: { projectId, type: 'GENERAL' },
        })
        if (!channel) throw new NotFoundException('General channel missing')
      }
    }

    if (!this.canAccessChannel(channel, ctx)) {
      throw new ForbiddenException('You do not have access to this channel')
    }

    return channel
  }

  async getMessages(projectId: string, userId: string, channelId?: string) {
    const channel = await this.resolveChannel(projectId, userId, channelId)

    // For the General channel, also surface legacy messages with no channelId.
    const where =
      channel.type === 'GENERAL'
        ? { projectId, OR: [{ channelId: channel.id }, { channelId: null }] }
        : { channelId: channel.id }

    const messages = await this.prisma.projectMessage.findMany({
      where,
      include: { sender: true },
      orderBy: { createdAt: 'asc' },
    })

    return messages.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      channelId: m.channelId ?? channel.id,
      senderId: m.senderId,
      senderName: m.sender?.name,
      content: this.safeDecrypt(m.content, m.iv),
      createdAt: m.createdAt,
    }))
  }

  async sendMessage(
    projectId: string,
    userId: string,
    content: string,
    channelId?: string,
  ) {
    const channel = await this.resolveChannel(projectId, userId, channelId)

    const encrypted = encrypt(content)

    const message = await this.prisma.projectMessage.create({
      data: {
        projectId,
        channelId: channel.id,
        senderId: userId,
        content: encrypted.content,
        iv: encrypted.iv,
      },
      include: { sender: true },
    })

    const formattedMessage = {
      id: message.id,
      projectId: message.projectId,
      channelId: channel.id,
      senderId: message.senderId,
      senderName: message.sender?.name,
      content,
      createdAt: message.createdAt,
    }

    this.chatGateway.sendNewMessage(projectId, formattedMessage)

    return formattedMessage
  }
}
