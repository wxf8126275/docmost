import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { sql } from 'kysely';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { PageAccessService } from '../../core/page/page-access/page-access.service';
import { User, Workspace, Page } from '@docmost/db/types/entity.types';
import {
  generateBaseChoiceId,
  generateBasePropertyId,
  generateSlugId,
} from '../../common/helpers';
import { generateKeyBetween } from './position.util';
import {
  evaluateNode,
  hasPredicate,
  sortRows,
  FilterNode,
  ViewSortConfig,
} from './base-filter.util';
import {
  ConvertBaseDto,
  CreateBaseDto,
  CreatePropertyDto,
  CreateRowDto,
  CreateViewDto,
  DeleteBaseDto,
  DeletePropertyDto,
  DeleteRowsDto,
  DeleteRowDto,
  DeleteViewDto,
  ExportCsvDto,
  ListBasesDto,
  ListRowsDto,
  ListViewsDto,
  ReorderPropertyDto,
  ReorderRowDto,
  RowInfoDto,
  UpdateBaseDto,
  UpdatePropertyDto,
  UpdateRowDto,
  UpdateViewDto,
  BaseInfoDto,
} from './base.dto';

type BasePropertyRow = {
  id: string;
  pageId: string;
  name: string;
  type: string;
  position: string;
  typeOptions: Record<string, unknown> | null;
  pendingType: string | null;
  pendingTypeOptions: Record<string, unknown> | null;
  isPrimary: boolean;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
};

type BaseRowRow = {
  id: string;
  pageId: string;
  cells: Record<string, unknown> | null;
  position: string;
  creatorId: string | null;
  lastUpdatedById: string | null;
  workspaceId: string;
  createdAt: Date;
  updatedAt: Date;
};

type BaseViewRow = {
  id: string;
  pageId: string;
  name: string;
  type: string;
  position: string;
  config: Record<string, unknown> | null;
  workspaceId: string;
  creatorId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface IBaseOut {
  id: string;
  slugId: string;
  name: string;
  icon: string | null;
  pageId: string;
  spaceId: string;
  workspaceId: string;
  creatorId: string | null;
  properties: unknown[];
  views: unknown[];
  createdAt: string;
  updatedAt: string;
  baseSchemaVersion: number;
  permissions?: { canEdit: boolean; hasRestriction: boolean };
}

@Injectable()
export class BaseService {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly pageRepo: PageRepo,
    private readonly pageAccessService: PageAccessService,
  ) {}

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async resolvePage(
    pageId: string,
    workspaceId: string,
  ): Promise<Page> {
    const page = await this.pageRepo.findById(pageId);
    if (!page || page.deletedAt) {
      throw new NotFoundException('Page not found');
    }
    if (page.workspaceId !== workspaceId) {
      throw new NotFoundException('Page not found');
    }
    return page;
  }

  private async assertCanEdit(page: Page, user: User): Promise<void> {
    await this.pageAccessService.validateCanEdit(page, user);
  }

  private async assertCanView(page: Page, user: User): Promise<void> {
    await this.pageAccessService.validateCanView(page, user);
  }

  private mapProperty(row: BasePropertyRow): Record<string, unknown> {
    return {
      id: row.id,
      pageId: row.pageId,
      name: row.name,
      type: row.type,
      position: row.position,
      typeOptions: row.typeOptions ?? {},
      pendingType: row.pendingType ?? null,
      pendingTypeOptions: row.pendingTypeOptions ?? null,
      isPrimary: row.isPrimary,
      workspaceId: row.workspaceId,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  private mapView(row: BaseViewRow): Record<string, unknown> {
    return {
      id: row.id,
      pageId: row.pageId,
      name: row.name,
      type: row.type,
      position: row.position,
      config: row.config ?? {},
      workspaceId: row.workspaceId,
      creatorId: row.creatorId,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  private mapRow(row: BaseRowRow): Record<string, unknown> {
    return {
      id: row.id,
      pageId: row.pageId,
      cells: row.cells ?? {},
      position: row.position,
      creatorId: row.creatorId,
      lastUpdatedById: row.lastUpdatedById,
      workspaceId: row.workspaceId,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  private toBase(
    page: Page,
    properties: BasePropertyRow[],
    views: BaseViewRow[],
    permissions?: { canEdit: boolean; hasRestriction: boolean },
  ): IBaseOut {
    return {
      id: page.id,
      slugId: page.slugId,
      name: page.title ?? '',
      icon: page.icon,
      pageId: page.id,
      spaceId: page.spaceId,
      workspaceId: page.workspaceId,
      creatorId: page.creatorId,
      properties: properties.map((p) => this.mapProperty(p)),
      views: views.map((v) => this.mapView(v)),
      createdAt: new Date(page.createdAt as Date).toISOString(),
      updatedAt: new Date(page.updatedAt as Date).toISOString(),
      baseSchemaVersion: page.baseSchemaVersion ?? 0,
      ...(permissions ? { permissions } : {}),
    };
  }

  private async getBaseInfoUnchecked(
    pageId: string,
    workspaceId: string,
  ): Promise<IBaseOut> {
    const page = await this.resolvePage(pageId, workspaceId);
    const [properties, views] = await Promise.all([
      this.db
        .selectFrom('baseProperties')
        .selectAll()
        .where('pageId', '=', pageId)
        .where('deletedAt', 'is', null)
        .orderBy('position', 'asc')
        .execute(),
      this.db
        .selectFrom('baseViews')
        .selectAll()
        .where('pageId', '=', pageId)
        .orderBy('position', 'asc')
        .execute(),
    ]);
    return this.toBase(page, properties as BasePropertyRow[], views as BaseViewRow[]);
  }

  // ---------------------------------------------------------------------------
  // Convert / Create / Info / Update / Delete / List
  // ---------------------------------------------------------------------------

  async convertPageToBase(
    user: User,
    workspaceId: string,
    dto: ConvertBaseDto,
  ): Promise<IBaseOut> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanEdit(page, user);
    if (page.isBase) {
      return this.getBaseInfo(user, workspaceId, { pageId: dto.pageId });
    }
    return this.initBaseSchema(user, workspaceId, dto.pageId, dto.template);
  }

  async createBase(
    user: User,
    workspaceId: string,
    dto: CreateBaseDto,
  ): Promise<IBaseOut> {
    let pageId = dto.pageId;
    if (!pageId) {
      const page = await this.pageRepo.insertPage({
        slugId: generateSlugId(),
        title: dto.name,
        icon: dto.icon ?? null,
        spaceId: dto.spaceId,
        creatorId: user.id,
        workspaceId,
        lastUpdatedById: user.id,
        isBase: false,
        position: generateKeyBetween(null, null),
      });
      pageId = page.id;
    } else {
      await this.resolvePage(pageId, workspaceId);
    }
    return this.initBaseSchema(user, workspaceId, pageId, undefined);
  }

  private async initBaseSchema(
    user: User,
    workspaceId: string,
    pageId: string,
    template?: 'kanban',
  ): Promise<IBaseOut> {
    const nameId = generateBasePropertyId();
    const properties: BasePropertyRow[] = [
      {
        id: nameId,
        pageId,
        name: 'Name',
        type: 'text',
        position: generateKeyBetween(null, null),
        typeOptions: {},
        pendingType: null,
        pendingTypeOptions: null,
        isPrimary: true,
        workspaceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    let viewType = 'table';
    let viewName = 'Table';
    let config: Record<string, unknown> = {};

    if (template === 'kanban') {
      const statusId = generateBasePropertyId();
      const todo = generateBaseChoiceId();
      const doing = generateBaseChoiceId();
      const done = generateBaseChoiceId();
      properties.push({
        id: statusId,
        pageId,
        name: 'Status',
        type: 'select',
        position: generateKeyBetween(nameId, null),
        typeOptions: {
          choices: [
            { id: todo, name: 'Todo', color: 'gray' },
            { id: doing, name: 'In progress', color: 'blue' },
            { id: done, name: 'Done', color: 'green' },
          ],
          choiceOrder: [todo, doing, done],
          disableColors: false,
        },
        pendingType: null,
        pendingTypeOptions: null,
        isPrimary: false,
        workspaceId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      viewType = 'kanban';
      viewName = 'Board';
      config = {
        groupByPropertyId: statusId,
        hiddenChoiceIds: [],
        choiceOrder: [],
      };
    }

    await this.db.transaction().execute(async (trx: KyselyTransaction) => {
      await trx.insertInto('baseProperties').values(properties as never).execute();
      await trx
        .insertInto('baseViews')
        .values({
          pageId,
          name: viewName,
          type: viewType,
          position: generateKeyBetween(null, null),
          config,
          workspaceId,
          creatorId: user.id,
        } as never)
        .execute();
      await trx
        .updateTable('pages')
        .set({ isBase: true, baseSchemaVersion: 1, updatedAt: new Date() })
        .where('id', '=', pageId)
        .where('workspaceId', '=', workspaceId)
        .execute();
    });

    return this.getBaseInfoUnchecked(pageId, workspaceId);
  }

  async getBaseInfo(
    user: User,
    workspaceId: string,
    dto: BaseInfoDto,
  ): Promise<IBaseOut> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanView(page, user);
    const perms = await this.pageAccessService.validateCanViewWithPermissions(
      page,
      user,
    );
    const [properties, views] = await Promise.all([
      this.db
        .selectFrom('baseProperties')
        .selectAll()
        .where('pageId', '=', dto.pageId)
        .where('deletedAt', 'is', null)
        .orderBy('position', 'asc')
        .execute(),
      this.db
        .selectFrom('baseViews')
        .selectAll()
        .where('pageId', '=', dto.pageId)
        .orderBy('position', 'asc')
        .execute(),
    ]);
    return this.toBase(
      page,
      properties as BasePropertyRow[],
      views as BaseViewRow[],
      { canEdit: perms.canEdit, hasRestriction: perms.hasRestriction },
    );
  }

  async updateBase(
    user: User,
    workspaceId: string,
    dto: UpdateBaseDto,
  ): Promise<IBaseOut> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanEdit(page, user);
    const update: Record<string, unknown> = {};
    if (dto.name !== undefined) update.title = dto.name;
    if (dto.icon !== undefined) update.icon = dto.icon;
    if (Object.keys(update).length > 0) {
      await this.pageRepo.updatePage(update as never, dto.pageId);
    }
    return this.getBaseInfoUnchecked(dto.pageId, workspaceId);
  }

  async deleteBase(
    user: User,
    workspaceId: string,
    dto: DeleteBaseDto,
  ): Promise<void> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanEdit(page, user);
    await this.db.transaction().execute(async (trx: KyselyTransaction) => {
      await trx
        .updateTable('baseRows')
        .set({ deletedAt: new Date() })
        .where('pageId', '=', dto.pageId)
        .execute();
      await trx
        .updateTable('baseProperties')
        .set({ deletedAt: new Date() })
        .where('pageId', '=', dto.pageId)
        .execute();
      await trx.deleteFrom('baseViews').where('pageId', '=', dto.pageId).execute();
      await trx
        .updateTable('pages')
        .set({ isBase: false, baseSchemaVersion: 0, updatedAt: new Date() })
        .where('id', '=', dto.pageId)
        .where('workspaceId', '=', workspaceId)
        .execute();
    });
  }

  async listBases(
    _user: User,
    workspaceId: string,
    dto: ListBasesDto,
  ): Promise<{ items: IBaseOut[]; meta: Record<string, unknown> }> {
    const limit = dto.limit ?? 50;
    let query = this.db
      .selectFrom('pages')
      .selectAll()
      .where('spaceId', '=', dto.spaceId)
      .where('workspaceId', '=', workspaceId)
      .where('isBase', '=', true)
      .where('deletedAt', 'is', null);
    if (dto.cursor) {
      query = query.where('id', '>', dto.cursor);
    }
    const pages = await query
      .orderBy('createdAt', 'desc')
      .limit(limit + 1)
      .execute();
    const hasNextPage = pages.length > limit;
    const items = pages.slice(0, limit).map(
      (p) =>
        this.toBase(p as Page, [], []) as IBaseOut,
    );
    return {
      items,
      meta: {
        limit,
        hasNextPage,
        hasPrevPage: false,
        nextCursor: hasNextPage ? items[items.length - 1].id : null,
        prevCursor: null,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------

  private async lastPropertyPosition(pageId: string): Promise<string | null> {
    const row = await this.db
      .selectFrom('baseProperties')
      .select('position')
      .where('pageId', '=', pageId)
      .where('deletedAt', 'is', null)
      .orderBy('position', 'desc')
      .limit(1)
      .executeTakeFirst();
    return row?.position ?? null;
  }

  async createProperty(
    user: User,
    workspaceId: string,
    dto: CreatePropertyDto,
  ): Promise<Record<string, unknown>> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanEdit(page, user);
    const lastPos = await this.lastPropertyPosition(dto.pageId);
    const row = await this.db
      .insertInto('baseProperties')
      .values({
        id: generateBasePropertyId(),
        pageId: dto.pageId,
        name: dto.name,
        type: dto.type,
        position: generateKeyBetween(lastPos, null),
        typeOptions: dto.typeOptions ?? {},
        isPrimary: false,
        workspaceId,
        schemaVersion: 1,
        pendingType: null,
        pendingTypeOptions: null,
        pendingToken: null,
      } as never)
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.mapProperty(row as unknown as BasePropertyRow);
  }

  async updateProperty(
    user: User,
    workspaceId: string,
    dto: UpdatePropertyDto,
  ): Promise<{ property: Record<string, unknown>; jobId: string | null }> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanEdit(page, user);
    const existing = await this.db
      .selectFrom('baseProperties')
      .selectAll()
      .where('id', '=', dto.propertyId)
      .where('pageId', '=', dto.pageId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
    if (!existing) {
      throw new NotFoundException('Property not found');
    }
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.type !== undefined) update.type = dto.type;
    if (dto.typeOptions !== undefined) update.typeOptions = dto.typeOptions;
    await this.db
      .updateTable('baseProperties')
      .set(update as never)
      .where('id', '=', dto.propertyId)
      .execute();
    const updated = await this.db
      .selectFrom('baseProperties')
      .selectAll()
      .where('id', '=', dto.propertyId)
      .executeTakeFirstOrThrow();
    return {
      property: this.mapProperty(updated as unknown as BasePropertyRow),
      jobId: null,
    };
  }

  async deleteProperty(
    user: User,
    workspaceId: string,
    dto: DeletePropertyDto,
  ): Promise<void> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanEdit(page, user);
    const existing = await this.db
      .selectFrom('baseProperties')
      .selectAll()
      .where('id', '=', dto.propertyId)
      .where('pageId', '=', dto.pageId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
    if (!existing) {
      throw new NotFoundException('Property not found');
    }
    await this.db.transaction().execute(async (trx: KyselyTransaction) => {
      // Drop the property's column from every row's cells.
      await trx
        .updateTable('baseRows')
        .set({ cells: sql`cells - ${dto.propertyId}` } as never)
        .where('pageId', '=', dto.pageId)
        .where('deletedAt', 'is', null)
        .execute();
      await trx
        .updateTable('baseProperties')
        .set({ deletedAt: new Date() })
        .where('id', '=', dto.propertyId)
        .execute();
    });
  }

  async reorderProperty(
    user: User,
    workspaceId: string,
    dto: ReorderPropertyDto,
  ): Promise<void> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanEdit(page, user);
    await this.db
      .updateTable('baseProperties')
      .set({ position: dto.position, updatedAt: new Date() })
      .where('id', '=', dto.propertyId)
      .where('pageId', '=', dto.pageId)
      .execute();
  }

  // ---------------------------------------------------------------------------
  // Rows
  // ---------------------------------------------------------------------------

  private async getRow(
    rowId: string,
    pageId: string,
  ): Promise<BaseRowRow> {
    const row = await this.db
      .selectFrom('baseRows')
      .selectAll()
      .where('id', '=', rowId)
      .where('pageId', '=', pageId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
    if (!row) {
      throw new NotFoundException('Row not found');
    }
    return row as BaseRowRow;
  }

  private async lastRowPosition(pageId: string): Promise<string | null> {
    const row = await this.db
      .selectFrom('baseRows')
      .select('position')
      .where('pageId', '=', pageId)
      .where('deletedAt', 'is', null)
      .orderBy('position', 'desc')
      .limit(1)
      .executeTakeFirst();
    return row?.position ?? null;
  }

  async createRow(
    user: User,
    workspaceId: string,
    dto: CreateRowDto,
  ): Promise<Record<string, unknown>> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanEdit(page, user);

    let position = dto.position;
    if (!position) {
      if (dto.afterRowId) {
        const after = await this.db
          .selectFrom('baseRows')
          .selectAll()
          .where('id', '=', dto.afterRowId)
          .where('pageId', '=', dto.pageId)
          .where('deletedAt', 'is', null)
          .executeTakeFirst();
        if (!after) {
          throw new NotFoundException('Row not found');
        }
        const next = await this.db
          .selectFrom('baseRows')
          .select('position')
          .where('pageId', '=', dto.pageId)
          .where('deletedAt', 'is', null)
          .where('position', '>', after.position)
          .orderBy('position', 'asc')
          .limit(1)
          .executeTakeFirst();
        position = generateKeyBetween(after.position, next?.position ?? null);
      } else {
        position = generateKeyBetween(await this.lastRowPosition(dto.pageId), null);
      }
    }

    const row = await this.db
      .insertInto('baseRows')
      .values({
        pageId: dto.pageId,
        cells: dto.cells ?? {},
        position,
        creatorId: user.id,
        workspaceId,
        lastUpdatedById: user.id,
      } as never)
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.mapRow(row as unknown as BaseRowRow);
  }

  async getRowInfo(
    user: User,
    workspaceId: string,
    dto: RowInfoDto,
  ): Promise<Record<string, unknown>> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanView(page, user);
    const row = await this.getRow(dto.rowId, dto.pageId);
    return this.mapRow(row);
  }

  async updateRow(
    user: User,
    workspaceId: string,
    dto: UpdateRowDto,
  ): Promise<Record<string, unknown>> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanEdit(page, user);
    const row = await this.getRow(dto.rowId, dto.pageId);

    const current = (row.cells ?? {}) as Record<string, unknown>;
    const merged: Record<string, unknown> = { ...current };
    for (const [key, value] of Object.entries(dto.cells)) {
      if (value === null) {
        delete merged[key];
      } else {
        merged[key] = value;
      }
    }

    await this.db
      .updateTable('baseRows')
      .set({
        cells: merged,
        lastUpdatedById: user.id,
        updatedAt: new Date(),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
      } as never)
      .where('id', '=', dto.rowId)
      .where('pageId', '=', dto.pageId)
      .execute();

    return this.mapRow({ ...row, cells: merged });
  }

  async deleteRow(
    user: User,
    workspaceId: string,
    dto: DeleteRowDto,
  ): Promise<void> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanEdit(page, user);
    await this.getRow(dto.rowId, dto.pageId);
    await this.db
      .updateTable('baseRows')
      .set({ deletedAt: new Date() })
      .where('id', '=', dto.rowId)
      .where('pageId', '=', dto.pageId)
      .execute();
  }

  async deleteRows(
    user: User,
    workspaceId: string,
    dto: DeleteRowsDto,
  ): Promise<void> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanEdit(page, user);
    if (dto.rowIds.length === 0) return;
    await this.db
      .updateTable('baseRows')
      .set({ deletedAt: new Date() })
      .where('pageId', '=', dto.pageId)
      .where('id', 'in', dto.rowIds)
      .execute();
  }

  async reorderRow(
    user: User,
    workspaceId: string,
    dto: ReorderRowDto,
  ): Promise<void> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanEdit(page, user);
    await this.getRow(dto.rowId, dto.pageId);
    await this.db
      .updateTable('baseRows')
      .set({ position: dto.position, updatedAt: new Date() })
      .where('id', '=', dto.rowId)
      .where('pageId', '=', dto.pageId)
      .execute();
  }

  async listRows(
    user: User,
    workspaceId: string,
    dto: ListRowsDto,
  ): Promise<{ items: Record<string, unknown>[]; meta: Record<string, unknown>; references: Record<string, unknown> }> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanView(page, user);

    const effectiveLimit = dto.limit ?? 100;
    let query = this.db
      .selectFrom('baseRows')
      .selectAll()
      .where('pageId', '=', dto.pageId)
      .where('deletedAt', 'is', null);
    if (dto.cursor) {
      query = query.where('position', '>', dto.cursor);
    }
    const raw = await query
      .orderBy('position', 'asc')
      .limit(effectiveLimit + 1)
      .execute();

    const properties = await this.db
      .selectFrom('baseProperties')
      .selectAll()
      .where('pageId', '=', dto.pageId)
      .where('deletedAt', 'is', null)
      .execute();
    const propTypeById = new Map<string, string>();
    for (const p of properties) {
      propTypeById.set((p as BasePropertyRow).id, (p as BasePropertyRow).type);
    }

    const filter = dto.filter as FilterNode | undefined;
    const sorts = (dto.sorts ?? []) as unknown as ViewSortConfig[];

    let items = raw.map((r) => this.mapRow(r as BaseRowRow));
    if (filter && hasPredicate(filter)) {
      items = items.filter((it) =>
        evaluateNode(filter, it as Record<string, unknown>, propTypeById),
      );
    }
    if (sorts.length > 0) {
      items = sortRows(items, sorts);
    }

    let hasNextPage = false;
    let nextCursor: string | null = null;
    if (!filter && sorts.length === 0) {
      hasNextPage = raw.length > effectiveLimit;
      items = items.slice(0, effectiveLimit);
      if (hasNextPage && items.length > 0) {
        nextCursor = (items[items.length - 1] as Record<string, unknown>)
          .position as string;
      }
    } else {
      items = items.slice(0, effectiveLimit);
    }

    return {
      items,
      meta: {
        limit: effectiveLimit,
        hasNextPage,
        hasPrevPage: false,
        nextCursor,
        prevCursor: null,
      },
      references: { users: {}, pages: {} },
    };
  }

  // ---------------------------------------------------------------------------
  // Views
  // ---------------------------------------------------------------------------

  private async lastViewPosition(pageId: string): Promise<string | null> {
    const row = await this.db
      .selectFrom('baseViews')
      .select('position')
      .where('pageId', '=', pageId)
      .orderBy('position', 'desc')
      .limit(1)
      .executeTakeFirst();
    return row?.position ?? null;
  }

  async createView(
    user: User,
    workspaceId: string,
    dto: CreateViewDto,
  ): Promise<Record<string, unknown>> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanEdit(page, user);
    const lastPos = await this.lastViewPosition(dto.pageId);
    const row = await this.db
      .insertInto('baseViews')
      .values({
        pageId: dto.pageId,
        name: dto.name,
        type: dto.type ?? 'table',
        position: generateKeyBetween(lastPos, null),
        config: dto.config ?? {},
        workspaceId,
        creatorId: user.id,
      } as never)
      .returningAll()
      .executeTakeFirstOrThrow();
    return this.mapView(row as unknown as BaseViewRow);
  }

  async updateView(
    user: User,
    workspaceId: string,
    dto: UpdateViewDto,
  ): Promise<Record<string, unknown>> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanEdit(page, user);
    const existing = await this.db
      .selectFrom('baseViews')
      .selectAll()
      .where('id', '=', dto.viewId)
      .where('pageId', '=', dto.pageId)
      .executeTakeFirst();
    if (!existing) {
      throw new NotFoundException('View not found');
    }
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.type !== undefined) update.type = dto.type;
    if (dto.position !== undefined) update.position = dto.position;
    if (dto.config !== undefined) {
      const merged: Record<string, unknown> = {
        ...((existing as BaseViewRow).config ?? {}),
      };
      for (const [k, v] of Object.entries(dto.config)) {
        if (v === null) delete merged[k];
        else merged[k] = v;
      }
      update.config = merged;
    }
    await this.db
      .updateTable('baseViews')
      .set(update as never)
      .where('id', '=', dto.viewId)
      .execute();
    const updated = await this.db
      .selectFrom('baseViews')
      .selectAll()
      .where('id', '=', dto.viewId)
      .executeTakeFirstOrThrow();
    return this.mapView(updated as unknown as BaseViewRow);
  }

  async deleteView(
    user: User,
    workspaceId: string,
    dto: DeleteViewDto,
  ): Promise<void> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanEdit(page, user);
    const remaining = await this.db
      .selectFrom('baseViews')
      .select('id')
      .where('pageId', '=', dto.pageId)
      .execute();
    if (remaining.length <= 1) {
      throw new BadRequestException('A base must have at least one view');
    }
    await this.db
      .deleteFrom('baseViews')
      .where('id', '=', dto.viewId)
      .where('pageId', '=', dto.pageId)
      .execute();
  }

  async listViews(
    user: User,
    workspaceId: string,
    dto: ListViewsDto,
  ): Promise<Record<string, unknown>[]> {
    const page = await this.resolvePage(dto.pageId, workspaceId);
    await this.assertCanView(page, user);
    const rows = await this.db
      .selectFrom('baseViews')
      .selectAll()
      .where('pageId', '=', dto.pageId)
      .orderBy('position', 'asc')
      .execute();
    return rows.map((r) => this.mapView(r as BaseViewRow));
  }

  // ---------------------------------------------------------------------------
  // CSV export
  // ---------------------------------------------------------------------------

  async exportCsv(
    user: User,
    workspaceId: string,
    dto: ExportCsvDto,
  ): Promise<{ csv: string; fileName: string }> {
    const base = await this.getBaseInfo(user, workspaceId, {
      pageId: dto.pageId,
    });
    const properties = base.properties as Record<string, unknown>[];
    const { items } = await this.listRows(user, workspaceId, {
      pageId: dto.pageId,
      limit: 100000,
    });

    const header = properties.map((p) => String(p.name ?? p.id));
    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      let s: string;
      if (Array.isArray(val)) {
        s = val.join('; ');
      } else if (typeof val === 'object') {
        s = JSON.stringify(val);
      } else {
        s = String(val);
      }
      if (/[",\n]/.test(s)) {
        s = '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const lines = [header.map(escapeCsv).join(',')];
    for (const row of items) {
      const cells = (row.cells ?? {}) as Record<string, unknown>;
      lines.push(
        properties
          .map((p) => escapeCsv(cells[String(p.id)]))
          .join(','),
      );
    }
    const page = await this.resolvePage(dto.pageId, workspaceId);
    const fileName = `${(page.title ?? 'base').replace(/[^\w\-]+/g, '_')}.csv`;
    return { csv: lines.join('\n'), fileName };
  }
}
