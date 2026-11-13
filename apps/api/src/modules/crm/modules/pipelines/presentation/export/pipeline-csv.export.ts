import type { CrmPipeline } from '#contracts';

export type PipelineCsvSortKey =
  | 'default'
  | 'name-asc'
  | 'name-desc'
  | 'leads-desc'
  | 'leads-asc';

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function sortPipelinesForExport(
  pipelines: readonly CrmPipeline[],
  sort: PipelineCsvSortKey,
): CrmPipeline[] {
  const items = [...pipelines];
  switch (sort) {
    case 'name-asc':
      return items.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return items.sort((a, b) => b.name.localeCompare(a.name));
    case 'leads-desc':
      return items.sort((a, b) => b.leadCount - a.leadCount || a.name.localeCompare(b.name));
    case 'leads-asc':
      return items.sort((a, b) => a.leadCount - b.leadCount || a.name.localeCompare(b.name));
    default:
      return items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }
}

export function pipelinesToCsv(pipelines: readonly CrmPipeline[]): string {
  const headers = ['Name', 'Description', 'Status', 'Default', 'Sort order', 'Leads', 'Stages'];
  const rows = pipelines.map((pipeline) =>
    [
      escapeCsvCell(pipeline.name),
      escapeCsvCell(pipeline.description),
      pipeline.status,
      pipeline.isDefault ? 'Yes' : 'No',
      String(pipeline.sortOrder),
      String(pipeline.leadCount),
      String(pipeline.stages.length),
    ].join(','),
  );
  return [headers.join(','), ...rows].join('\r\n');
}

export function parsePipelineExportSort(value: string | undefined): PipelineCsvSortKey {
  switch (value) {
    case 'name-asc':
    case 'name-desc':
    case 'leads-desc':
    case 'leads-asc':
      return value;
    default:
      return 'default';
  }
}
