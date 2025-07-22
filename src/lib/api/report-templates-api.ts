import type { ReportTemplate, ReportTemplateForm } from '../schema';
import { buildOrgApiUrl, createFetchOptions } from './api-tools';

// API client for report templates - organization-scoped only!

export const reportTemplatesApi = {
  // Get all report templates
  async getReportTemplates(organizationId: string): Promise<ReportTemplate[]> {
    const url = buildOrgApiUrl(organizationId, '/report-templates');
    const response = await fetch(url, createFetchOptions());

    if (!response.ok) {
      throw new Error('Failed to fetch report templates');
    }

    return response.json();
  },

  // Create a new report template
  async createReportTemplate(
    templateData: ReportTemplateForm,
    organizationId: string
  ): Promise<ReportTemplate> {
    const url = buildOrgApiUrl(organizationId, '/report-templates');
    const response = await fetch(
      url,
      createFetchOptions({
        method: 'POST',
        body: JSON.stringify({ templateData }),
      })
    );

    if (!response.ok) {
      throw new Error('Failed to create report template');
    }

    return response.json();
  },

  // Update an existing report template
  async updateReportTemplate(
    templateId: string,
    templateData: Partial<ReportTemplateForm>,
    organizationId: string
  ): Promise<ReportTemplate> {
    const url = buildOrgApiUrl(organizationId, '/report-templates');
    const response = await fetch(
      url,
      createFetchOptions({
        method: 'PUT',
        body: JSON.stringify({ templateId, templateData }),
      })
    );

    if (!response.ok) {
      throw new Error('Failed to update report template');
    }

    return response.json();
  },

  // Delete a report template
  async deleteReportTemplate(
    templateId: string,
    organizationId: string
  ): Promise<{ success: boolean }> {
    const endpoint = `/report-templates?templateId=${templateId}`;
    const url = buildOrgApiUrl(organizationId, endpoint);
    const response = await fetch(
      url,
      createFetchOptions({
        method: 'DELETE',
      })
    );

    if (!response.ok) {
      throw new Error('Failed to delete report template');
    }

    return response.json();
  },
};
