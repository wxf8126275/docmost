import { Injectable } from '@nestjs/common';
import { SpaceRepo } from '@docmost/db/repos/space/space.repo';
import { SpaceService } from '../../core/space/services/space.service';
import { generateSlugId } from '../../common/helpers/nanoid.utils';
import { User, Space } from '@docmost/db/types/entity.types';
import { CreatePersonalSpaceDto } from './personal-space.dto';

@Injectable()
export class PersonalSpaceService {
  constructor(
    private readonly spaceRepo: SpaceRepo,
    private readonly spaceService: SpaceService,
  ) {}

  async getPersonalSpace(
    user: User,
    workspaceId: string,
  ): Promise<Space | null> {
    const space = await this.spaceRepo.findPersonalSpace(user.id, workspaceId);
    return space ?? null;
  }

  async createPersonalSpace(
    user: User,
    workspaceId: string,
    dto: CreatePersonalSpaceDto,
  ): Promise<Space> {
    const existing = await this.spaceRepo.findPersonalSpace(
      user.id,
      workspaceId,
    );
    if (existing) {
      return existing;
    }

    const name = dto.name?.trim() || 'Personal Space';
    const slug = generateSlugId();

    return this.spaceService.createSpace(
      user,
      workspaceId,
      { name, description: '', slug },
      undefined,
      { isPersonal: true },
    );
  }
}
