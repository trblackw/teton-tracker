import type { ReportTemplate, ReportTemplateForm } from '../schema';
import { API_BASE, createFetchOptions } from './api-tools';

// API client for report templates

export const reportTemplatesApi = {
  // Get all report templates for the organization
  async getReportTemplates(): Promise<ReportTemplate[]> {
    const response = await fetch(
      `${API_BASE}/report-templates`,
      createFetchOptions()
    );

    if (!response.ok) {
      throw new Error('Failed to fetch report templates');
    }

    return response.json();
  },

  // Create a new report template
  async createReportTemplate(
    templateData: ReportTemplateForm
  ): Promise<ReportTemplate> {
    const response = await fetch(
      `${API_BASE}/report-templates`,
      createFetchOptions({
        method: 'POST',
        body: JSON.stringify({ templateData }),
      })
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create report template');
    }

    return response.json();
  },

  // Update an existing report template
  async updateReportTemplate(
    id: string,
    templateData: ReportTemplateForm
  ): Promise<ReportTemplate> {
    const response = await fetch(
      `${API_BASE}/report-templates`,
      createFetchOptions({
        method: 'PUT',
        body: JSON.stringify({ id, templateData }),
      })
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update report template');
    }

    return response.json();
  },

  // Delete a report template
  async deleteReportTemplate(id: string): Promise<void> {
    const response = await fetch(
      `${API_BASE}/report-templates?id=${id}`,
      createFetchOptions({
        method: 'DELETE',
      })
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete report template');
    }
  },
};
