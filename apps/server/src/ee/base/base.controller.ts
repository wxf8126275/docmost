import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { BaseService } from './base.service';
import {
  BaseInfoDto,
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
} from './base.dto';

@Controller('bases')
@UseGuards(JwtAuthGuard)
export class BaseController {
  constructor(private readonly baseService: BaseService) {}

  @HttpCode(HttpStatus.OK)
  @Post('convert')
  convert(
    @Body() dto: ConvertBaseDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.convertPageToBase(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('info')
  info(
    @Body() dto: BaseInfoDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.getBaseInfo(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  create(
    @Body() dto: CreateBaseDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.createBase(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  update(
    @Body() dto: UpdateBaseDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.updateBase(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  remove(
    @Body() dto: DeleteBaseDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.deleteBase(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post()
  list(
    @Body() dto: ListBasesDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.listBases(user, workspace.id, dto);
  }

  // --- Properties ---

  @HttpCode(HttpStatus.OK)
  @Post('properties/create')
  createProperty(
    @Body() dto: CreatePropertyDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.createProperty(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('properties/update')
  updateProperty(
    @Body() dto: UpdatePropertyDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.updateProperty(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('properties/delete')
  deleteProperty(
    @Body() dto: DeletePropertyDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.deleteProperty(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('properties/reorder')
  reorderProperty(
    @Body() dto: ReorderPropertyDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.reorderProperty(user, workspace.id, dto);
  }

  // --- Rows ---

  @HttpCode(HttpStatus.OK)
  @Post('rows/create')
  createRow(
    @Body() dto: CreateRowDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.createRow(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('rows/info')
  rowInfo(
    @Body() dto: RowInfoDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.getRowInfo(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('rows/update')
  updateRow(
    @Body() dto: UpdateRowDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.updateRow(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('rows/delete')
  deleteRow(
    @Body() dto: DeleteRowDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.deleteRow(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('rows/delete-many')
  deleteRows(
    @Body() dto: DeleteRowsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.deleteRows(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('rows/reorder')
  reorderRow(
    @Body() dto: ReorderRowDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.reorderRow(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('rows')
  listRows(
    @Body() dto: ListRowsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.listRows(user, workspace.id, dto);
  }

  // --- Views ---

  @HttpCode(HttpStatus.OK)
  @Post('views/create')
  createView(
    @Body() dto: CreateViewDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.createView(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('views/update')
  updateView(
    @Body() dto: UpdateViewDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.updateView(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('views/delete')
  deleteView(
    @Body() dto: DeleteViewDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.deleteView(user, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('views')
  listViews(
    @Body() dto: ListViewsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.baseService.listViews(user, workspace.id, dto);
  }

  // --- Export ---

  @HttpCode(HttpStatus.OK)
  @Post('export-csv')
  async exportCsv(
    @Body() dto: ExportCsvDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
    @Res() res: Response,
  ) {
    const { csv, fileName } = await this.baseService.exportCsv(
      user,
      workspace.id,
      dto,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(
        fileName,
      )}`,
    );
    res.send(csv);
  }
}
