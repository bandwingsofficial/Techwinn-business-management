import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type {
  CrmPipeline,
  CrmPipelineBulkActionResponse,
  CrmPipelineListResponse,
  CrmPipelineStage,
} from '#contracts';
import {
  bulkPipelineIdsRequestSchema,
  bulkPipelineStatusRequestSchema,
  createPipelineRequestSchema,
  updatePipelineRequestSchema,
  type CreatePipelineStageRequest,
  type CreatePipelineRequest,
  type ReorderPipelineStagesRequest,
  type UpdatePipelineRequest,
  type UpdatePipelineStageRequest,
} from '#validation';
import { z } from 'zod';
import { ActivatePipelineStageHandler } from '../../application/activate-stage/activate-pipeline-stage.handler.js';
import { BulkDeletePipelinesHandler } from '../../application/bulk-delete/bulk-delete-pipelines.handler.js';
import { BulkUpdatePipelineStatusHandler } from '../../application/bulk-update-status/bulk-update-pipeline-status.handler.js';
import { CreatePipelineHandler } from '../../application/create/create-pipeline.handler.js';
import { CreatePipelineStageHandler } from '../../application/create-stage/create-pipeline-stage.handler.js';
import { DeactivatePipelineStageHandler } from '../../application/deactivate-stage/deactivate-pipeline-stage.handler.js';
import { DeletePipelineHandler } from '../../application/delete/delete-pipeline.handler.js';
import { DeletePipelineStageHandler } from '../../application/delete-stage/delete-pipeline-stage.handler.js';
import { GetDefaultPipelineHandler } from '../../application/get-default/get-default-pipeline.handler.js';
import { GetPipelineHandler } from '../../application/get/get-pipeline.handler.js';
import { ListPipelinesHandler } from '../../application/list/list-pipelines.handler.js';
import { ReorderPipelineStagesHandler } from '../../application/reorder/reorder-pipeline-stages.handler.js';
import { UpdatePipelineHandler } from '../../application/update/update-pipeline.handler.js';
import { UpdatePipelineStageHandler } from '../../application/update-stage/update-pipeline-stage.handler.js';
import { PlatformAdminGuard } from '../../../../../auth/index.js';
import {
  createStageBodySchema,
  crmPipelineBulkActionResponseSchema,
  crmPipelineListResponseSchema,
  crmPipelineResponseSchema,
  crmPipelineStageResponseSchema,
  deleteStageBodySchema,
  reorderStagesBodySchema,
  toOpenApiSchema,
  updateStageBodySchema,
} from '../../../../shared/presentation/http/dto/crm.schemas.js';
import { CrmExceptionFilter } from '../../../../shared/presentation/http/filters/crm-exception.filter.js';
import { CrmContext } from '../../../../shared/presentation/http/guards/crm-context.decorator.js';
import type {
  CrmAuthenticatedRequest,
  CrmRequestContext,
} from '../../../../shared/presentation/http/guards/crm-organization.guard.js';
import { CrmOrganizationGuard } from '../../../../shared/presentation/http/guards/crm-organization.guard.js';
import { toCrmActor } from '../../../../shared/presentation/http/mappers/crm-actor.mapper.js';
import type { PermissionKey } from '#contracts';
import { OrgAccessForbiddenError } from '../../../../../org-access/domain/errors/org-access.errors.js';
import { PermissionCheckerService } from '../../../../../org-access/application/services/permission-checker.service.js';
import type { OrgAccessActor } from '../../../../../org-access/application/shared/org-access-actor.js';
import {
  RequirePermissions,
  RequirePermissionsGuard,
} from '../../../../../org-access/index.js';
import {
  toCrmPipelineFromReadModel,
  toCrmPipelineStageFromReadModel,
} from '../mappers/pipeline-response.mapper.js';
import {
  parsePipelineExportSort,
  pipelinesToCsv,
  sortPipelinesForExport,
} from '../export/pipeline-csv.export.js';

@ApiTags('CRM pipelines')
@ApiBearerAuth()
@Controller('crm/pipelines')
@UseGuards(PlatformAdminGuard, CrmOrganizationGuard, RequirePermissionsGuard)
@UseFilters(CrmExceptionFilter)
export class PipelineController {
  constructor(
    @Inject(ListPipelinesHandler) private readonly listPipelines: ListPipelinesHandler,
    @Inject(GetDefaultPipelineHandler) private readonly getDefaultPipeline: GetDefaultPipelineHandler,
    @Inject(GetPipelineHandler) private readonly getPipeline: GetPipelineHandler,
    @Inject(CreatePipelineHandler) private readonly createPipeline: CreatePipelineHandler,
    @Inject(UpdatePipelineHandler) private readonly updatePipeline: UpdatePipelineHandler,
    @Inject(ReorderPipelineStagesHandler)
    private readonly reorderPipelineStages: ReorderPipelineStagesHandler,
    @Inject(CreatePipelineStageHandler) private readonly createPipelineStage: CreatePipelineStageHandler,
    @Inject(UpdatePipelineStageHandler) private readonly updatePipelineStage: UpdatePipelineStageHandler,
    @Inject(ActivatePipelineStageHandler)
    private readonly activatePipelineStage: ActivatePipelineStageHandler,
    @Inject(DeactivatePipelineStageHandler)
    private readonly deactivatePipelineStage: DeactivatePipelineStageHandler,
    @Inject(DeletePipelineStageHandler) private readonly deletePipelineStage: DeletePipelineStageHandler,
    @Inject(BulkUpdatePipelineStatusHandler)
    private readonly bulkUpdatePipelineStatus: BulkUpdatePipelineStatusHandler,
    @Inject(BulkDeletePipelinesHandler)
    private readonly bulkDeletePipelines: BulkDeletePipelinesHandler,
    @Inject(DeletePipelineHandler) private readonly deletePipeline: DeletePipelineHandler,
    @Inject(PermissionCheckerService) private readonly permissionChecker: PermissionCheckerService,
  ) {}

  private async assertActorHasEveryPermission(
    actor: OrgAccessActor,
    required: readonly PermissionKey[],
  ): Promise<void> {
    if (required.length === 0) return;
    const effective = new Set(await this.permissionChecker.resolveEffectivePermissions(actor));
    if (!required.every((key) => effective.has(key))) {
      throw new OrgAccessForbiddenError('You do not have permission to perform this action.');
    }
  }

  private async assertPipelineUpdatePermissions(
    actor: OrgAccessActor,
    body: UpdatePipelineRequest,
  ): Promise<void> {
    const touchesStatus = body.status !== undefined;
    const touchesOther =
      body.name !== undefined ||
      body.description !== undefined ||
      body.stages !== undefined ||
      body.sortOrder !== undefined;
    const required: PermissionKey[] = [];
    if (touchesOther) required.push('crm.pipeline.edit');
    if (touchesStatus) required.push('crm.pipeline.status');
    await this.assertActorHasEveryPermission(actor, required);
  }

  @RequirePermissions('crm.pipeline.view')
  @Get()
  @ApiOperation({ summary: 'List pipelines for the current organization' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineListResponseSchema) })
  async list(
    @CrmContext() ctx: CrmRequestContext,
    @Query('search') search?: string,
    @Query('status') status?: 'ACTIVE' | 'INACTIVE',
  ): Promise<CrmPipelineListResponse> {
    const result = await this.listPipelines.execute({
      actor: toCrmActor(ctx),
      filters: {
        search: search?.trim() || undefined,
        status: status === 'ACTIVE' || status === 'INACTIVE' ? status : undefined,
      },
    });
    return { pipelines: result.pipelines.map(toCrmPipelineFromReadModel) };
  }

  @RequirePermissions('crm.pipeline.view')
  @Get('default')
  @ApiOperation({ summary: 'Get the organization default pipeline with stages' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineResponseSchema) })
  async getDefault(@CrmContext() ctx: CrmRequestContext): Promise<CrmPipeline> {
    const result = await this.getDefaultPipeline.execute({ actor: toCrmActor(ctx) });
    return toCrmPipelineFromReadModel(result.pipeline);
  }

  @RequirePermissions('crm.pipeline.export')
  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: 'Export pipelines for the current organization as CSV' })
  async exportCsv(
    @CrmContext() ctx: CrmRequestContext,
    @Query('search') search?: string,
    @Query('status') status?: 'ACTIVE' | 'INACTIVE',
    @Query('sort') sort?: string,
  ): Promise<StreamableFile> {
    const result = await this.listPipelines.execute({
      actor: toCrmActor(ctx),
      filters: {
        search: search?.trim() || undefined,
        status: status === 'ACTIVE' || status === 'INACTIVE' ? status : undefined,
      },
    });
    const pipelines = result.pipelines.map(toCrmPipelineFromReadModel);
    const sorted = sortPipelinesForExport(pipelines, parsePipelineExportSort(sort));
    const csv = `\ufeff${pipelinesToCsv(sorted)}`;
    return new StreamableFile(Buffer.from(csv, 'utf-8'), {
      disposition: 'attachment; filename="pipelines.csv"',
    });
  }

  @RequirePermissions('crm.pipeline.status')
  @Post('bulk/status')
  @ApiOperation({ summary: 'Activate or deactivate multiple pipelines' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineBulkActionResponseSchema) })
  async bulkStatus(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<CrmPipelineBulkActionResponse> {
    const body = bulkPipelineStatusRequestSchema.parse(raw);
    return this.bulkUpdatePipelineStatus.execute({
      actor: toCrmActor(ctx),
      pipelineIds: body.pipelineIds,
      status: body.status,
    });
  }

  @RequirePermissions('crm.pipeline.bulk_delete')
  @Post('bulk/delete')
  @ApiOperation({ summary: 'Delete multiple empty non-default pipelines' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineBulkActionResponseSchema) })
  async bulkDelete(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<CrmPipelineBulkActionResponse> {
    const body = bulkPipelineIdsRequestSchema.parse(raw);
    return this.bulkDeletePipelines.execute({
      actor: toCrmActor(ctx),
      pipelineIds: body.pipelineIds,
    });
  }

  @RequirePermissions('crm.pipeline.view')
  @Get(':pipelineId')
  @ApiOperation({ summary: 'Get a pipeline with stages' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineResponseSchema) })
  async get(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
  ): Promise<CrmPipeline> {
    const result = await this.getPipeline.execute({
      actor: toCrmActor(ctx),
      pipelineId,
    });
    return toCrmPipelineFromReadModel(result.pipeline);
  }

  @RequirePermissions('crm.pipeline.create')
  @Post()
  @ApiOperation({ summary: 'Create a pipeline with default stages' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineResponseSchema) })
  async create(
    @CrmContext() ctx: CrmRequestContext,
    @Body() raw: unknown,
  ): Promise<CrmPipeline> {
    const body: CreatePipelineRequest = createPipelineRequestSchema.parse(raw);
    const result = await this.createPipeline.execute({
      actor: toCrmActor(ctx),
      input: body,
    });
    return toCrmPipelineFromReadModel(result.pipeline);
  }

  @RequirePermissions('crm.pipeline.view')
  @Patch(':pipelineId')
  @ApiOperation({ summary: 'Update pipeline details and stages' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineResponseSchema) })
  async update(
    @CrmContext() ctx: CrmRequestContext,
    @Req() request: CrmAuthenticatedRequest,
    @Param('pipelineId') pipelineId: string,
    @Body() raw: unknown,
  ): Promise<CrmPipeline> {
    const body: UpdatePipelineRequest = updatePipelineRequestSchema.parse(raw);
    const accessActor: OrgAccessActor = {
      organizationId: ctx.organizationId,
      adminId: ctx.adminId,
      isPlatformSuperAdmin: request.platformAuth?.admin.role === 'SUPER_ADMIN',
    };
    await this.assertPipelineUpdatePermissions(accessActor, body);
    const result = await this.updatePipeline.execute({
      actor: toCrmActor(ctx),
      pipelineId,
      input: body,
    });
    return toCrmPipelineFromReadModel(result.pipeline);
  }

  @RequirePermissions('crm.pipeline.delete')
  @Delete(':pipelineId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an empty pipeline' })
  @ApiNoContentResponse()
  async remove(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
  ): Promise<void> {
    await this.deletePipeline.execute({
      actor: toCrmActor(ctx),
      pipelineId,
    });
  }

  @RequirePermissions('crm.pipeline.edit')
  @Post(':pipelineId/stages/reorder')
  @ApiOperation({ summary: 'Reorder stages within a pipeline' })
  @ApiOkResponse({ schema: toOpenApiSchema(z.array(crmPipelineStageResponseSchema)) })
  async reorderStages(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
    @Body({ schema: reorderStagesBodySchema }) body: ReorderPipelineStagesRequest,
  ): Promise<readonly CrmPipelineStage[]> {
    const result = await this.reorderPipelineStages.execute({
      actor: toCrmActor(ctx),
      pipelineId,
      orderedStageIds: body.orderedStageIds,
    });
    return result.stages.map(toCrmPipelineStageFromReadModel);
  }

  @RequirePermissions('crm.pipeline.edit')
  @Post(':pipelineId/stages')
  @ApiOperation({ summary: 'Add a pipeline stage' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineStageResponseSchema) })
  async createStage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
    @Body({ schema: createStageBodySchema }) body: CreatePipelineStageRequest,
  ): Promise<CrmPipelineStage> {
    const result = await this.createPipelineStage.execute({
      actor: toCrmActor(ctx),
      pipelineId,
      input: body,
    });
    return toCrmPipelineStageFromReadModel(result.stage);
  }

  @RequirePermissions('crm.pipeline.edit')
  @Patch(':pipelineId/stages/:stageId')
  @ApiOperation({ summary: 'Update a pipeline stage' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineStageResponseSchema) })
  async updateStage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
    @Param('stageId') stageId: string,
    @Body({ schema: updateStageBodySchema }) body: UpdatePipelineStageRequest,
  ): Promise<CrmPipelineStage> {
    const result = await this.updatePipelineStage.execute({
      actor: toCrmActor(ctx),
      pipelineId,
      stageId,
      input: body,
    });
    return toCrmPipelineStageFromReadModel(result.stage);
  }

  @RequirePermissions('crm.pipeline.edit')
  @Post(':pipelineId/stages/:stageId/activate')
  @ApiOperation({ summary: 'Activate a pipeline stage (appends to end of active order)' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineStageResponseSchema) })
  async activateStage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
    @Param('stageId') stageId: string,
  ): Promise<CrmPipelineStage> {
    const result = await this.activatePipelineStage.execute({
      actor: toCrmActor(ctx),
      pipelineId,
      stageId,
    });
    return toCrmPipelineStageFromReadModel(result.stage);
  }

  @RequirePermissions('crm.pipeline.edit')
  @Post(':pipelineId/stages/:stageId/deactivate')
  @ApiOperation({ summary: 'Deactivate a pipeline stage (reassign leads when required)' })
  @ApiOkResponse({ schema: toOpenApiSchema(crmPipelineStageResponseSchema) })
  async deactivateStage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
    @Param('stageId') stageId: string,
    @Body({ schema: deleteStageBodySchema }) body: { targetStageId?: string },
  ): Promise<CrmPipelineStage> {
    const result = await this.deactivatePipelineStage.execute({
      actor: toCrmActor(ctx),
      pipelineId,
      stageId,
      targetStageId: body.targetStageId,
    });
    return toCrmPipelineStageFromReadModel(result.stage);
  }

  @RequirePermissions('crm.pipeline.edit')
  @Delete(':pipelineId/stages/:stageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a stage (reassign leads when required)' })
  @ApiNoContentResponse()
  async deleteStage(
    @CrmContext() ctx: CrmRequestContext,
    @Param('pipelineId') pipelineId: string,
    @Param('stageId') stageId: string,
    @Body({ schema: deleteStageBodySchema }) body: { targetStageId?: string },
  ): Promise<void> {
    await this.deletePipelineStage.execute({
      actor: toCrmActor(ctx),
      pipelineId,
      stageId,
      targetStageId: body.targetStageId,
    });
  }
}
