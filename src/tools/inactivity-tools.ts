/**
 * GoHighLevel Inactivity Detection Tools
 * Implements inactivity detection for contacts and opportunities
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GHLApiClient } from '../clients/ghl-api-client.js';
import {
    MCPDetectContactsInactivityParams,
    MCPDetectOpportunitiesInactivityParams,
    GHLDetectContactsInactivityResponse,
    GHLDetectOpportunitiesInactivityResponse,
    GHLInactiveContact,
    GHLInactiveOpportunity,
    GHLContact,
    GHLOpportunity
} from '../types/ghl-types.js';

/**
 * Inactivity Tools class
 * Provides inactivity detection capabilities for contacts and opportunities
 */
export class InactivityTools {
  constructor(private ghlClient: GHLApiClient) {}

  /**
   * Get tool definitions for all inactivity operations
   */
  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'detect_contacts_inactivity',
        description: 'Detect contacts that have had no activity within a specified number of days. Checks conversations, appointments, notes, and tasks for recent activity.',
        inputSchema: {
          type: 'object',
          properties: {
            inactivityDays: {
              type: 'number',
              description: 'Number of days to check for inactivity',
              minimum: 1,
              maximum: 365
            }
          },
          required: ['inactivityDays']
        }
      },
      {
        name: 'detect_opportunities_inactivity',
        description: 'Detect opportunities that have had no status or stage changes within a specified number of days.',
        inputSchema: {
          type: 'object',
          properties: {
            inactivityDays: {
              type: 'number',
              description: 'Number of days to check for inactivity',
              minimum: 1,
              maximum: 365
            }
          },
          required: ['inactivityDays']
        }
      }
    ];
  }

  /**
   * Execute inactivity detection tools
   */
  async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'detect_contacts_inactivity':
        return await this.detectContactsInactivity(args as MCPDetectContactsInactivityParams);
      case 'detect_opportunities_inactivity':
        return await this.detectOpportunitiesInactivity(args as MCPDetectOpportunitiesInactivityParams);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Detect contacts inactivity
   */
  private async detectContactsInactivity(params: MCPDetectContactsInactivityParams): Promise<GHLDetectContactsInactivityResponse> {
    const { inactivityDays } = params;

    // Calculate date range for inactivity check
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - inactivityDays);

    const inactiveContacts: GHLInactiveContact[] = [];
    let totalContactsChecked = 0;
    const errors: string[] = [];

    try {
      // Get all contacts with cursor-based pagination (required for > 10,000 records)
      let contacts: GHLContact[] = [];
      let searchAfter: [number, string] | undefined;

      while (true) {
        const searchParams: any = {
          locationId: this.ghlClient.getConfig().locationId,
          pageLimit: 100, // Use pageLimit instead of limit
          ...(searchAfter && { searchAfter })
        };

        const contactsResponse = await this.ghlClient.searchContacts(searchParams);
        if (!contactsResponse.success) {
          throw new Error(contactsResponse.error?.message || 'Failed to search contacts');
        }

        const batchContacts = contactsResponse.data?.contacts || [];
        contacts.push(...batchContacts);

        // Check pagination: if we got fewer contacts than requested or no searchAfter, we're done
        if (batchContacts.length < 100 || !contactsResponse.data?.searchAfter) {
          break;
        }

        // Use the searchAfter from response for next page
        searchAfter = contactsResponse.data.searchAfter;

        // Safety check to prevent infinite loops (API limit is much higher with cursor pagination)
        if (contacts.length > 50000) {
          errors.push('Too many contacts, stopping at 50000');
          break;
        }
      }

      // Check each contact for inactivity
      for (const contact of contacts) {
        if (!contact.id) continue;

        totalContactsChecked += 1;

        try {
          const isInactive = await this.checkContactActivity(contact.id, startDate);

          if (isInactive.inactive) {
            const inactiveContact: GHLInactiveContact = {
              ...contact,
              daysInactive: inactivityDays,
              lastActivityDate: isInactive.lastActivityDate?.toISOString()
            };
            inactiveContacts.push(inactiveContact);
          }
        } catch (error) {
          errors.push(`Error checking contact ${contact.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      errors.push(`Error fetching contacts: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      inactiveContacts,
      totalContactsChecked,
      inactiveCount: inactiveContacts.length,
      errors,
      inactivityThresholdDays: inactivityDays
    };
  }

  /**
   * Detect opportunities inactivity
   */
  private async detectOpportunitiesInactivity(params: MCPDetectOpportunitiesInactivityParams): Promise<GHLDetectOpportunitiesInactivityResponse> {
    const { inactivityDays } = params;

    // Calculate date range for inactivity check
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - inactivityDays);

    const inactiveOpportunities: GHLInactiveOpportunity[] = [];
    let totalOpportunitiesChecked = 0;
    const errors: string[] = [];

    try {
      // Get all opportunities with pagination
      let opportunities: GHLOpportunity[] = [];
      let startAfter: number | undefined;
      let startAfterId = '';

      while (true) {
        const searchParams: any = {
          location_id: this.ghlClient.getConfig().locationId,
          limit: 100,
          ...(startAfterId && { start_after_id: startAfterId })
        };

        if (startAfter !== undefined) {
          searchParams.start_after = startAfter;
        }

        const opportunitiesResponse = await this.ghlClient.searchOpportunities(searchParams);
        if (!opportunitiesResponse.success) {
          throw new Error(opportunitiesResponse.error?.message || 'Failed to search opportunities');
        }

        const batchOpportunities = opportunitiesResponse.data?.opportunities || [];
        opportunities.push(...batchOpportunities);

        // Check pagination
        const meta = opportunitiesResponse.data?.meta;
        // Check for nextPageUrl or if there's a next page number
        const hasMorePages = !!meta?.nextPageUrl || (meta?.nextPage && meta.currentPage && meta.nextPage > meta.currentPage);
        if (!hasMorePages) {
          break;
        }

        startAfter = meta?.startAfter;
        startAfterId = meta?.startAfterId || '';

        // Safety check to prevent infinite loops
        if (opportunities.length > 10000) {
          errors.push('Too many opportunities, stopping at 10000');
          break;
        }
      }

      // Check each opportunity for inactivity
      for (const opportunity of opportunities) {
        if (!opportunity.id) continue;

        totalOpportunitiesChecked += 1;

        try {
          // Check last status change and last stage change timestamps
          const lastStatusChange = opportunity.lastStatusChangeAt;
          const lastStageChange = opportunity.lastStageChangeAt;

          // Determine the most recent activity date
          let lastActivityDate: Date | undefined;

          if (lastStatusChange) {
            const statusDate = new Date(lastStatusChange.replace('Z', '+00:00'));
            if (!lastActivityDate || statusDate > lastActivityDate) {
              lastActivityDate = statusDate;
            }
          }

          if (lastStageChange) {
            const stageDate = new Date(lastStageChange.replace('Z', '+00:00'));
            if (!lastActivityDate || stageDate > lastActivityDate) {
              lastActivityDate = stageDate;
            }
          }

          // Check if opportunity has been active within the timeframe
          const isInactive = !lastActivityDate || lastActivityDate < startDate;

          if (isInactive) {
            const inactiveOpportunity: GHLInactiveOpportunity = {
              ...opportunity,
              daysInactive: inactivityDays,
              lastActivityDate: lastActivityDate?.toISOString()
            };
            inactiveOpportunities.push(inactiveOpportunity);
          }
        } catch (error) {
          errors.push(`Error checking opportunity ${opportunity.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      errors.push(`Error fetching opportunities: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      inactiveOpportunities,
      totalOpportunitiesChecked,
      inactiveCount: inactiveOpportunities.length,
      errors,
      inactivityThresholdDays: inactivityDays
    };
  }

  /**
   * Check if a contact has been active within the specified date range
   */
  private async checkContactActivity(contactId: string, startDate: Date): Promise<{ inactive: boolean; lastActivityDate?: Date }> {
    let hasRecentActivity = false;
    let lastActivityDate: Date | undefined;

    try {
      // 1. Check conversations - search for conversations with this contact
      const conversationsResponse = await this.ghlClient.searchConversations({
        locationId: this.ghlClient.getConfig().locationId,
        contactId: contactId,
        limit: 50 // Get recent conversations
      });

      if (conversationsResponse.success && conversationsResponse.data?.conversations) {
        for (const conv of conversationsResponse.data.conversations) {
          if (conv.dateAdded) {
            const convDate = new Date(conv.dateAdded.replace('Z', '+00:00'));
            if (convDate >= startDate) {
              hasRecentActivity = true;
            }
            if (!lastActivityDate || convDate > lastActivityDate) {
              lastActivityDate = convDate;
            }
          }
        }
      }

      // 2. Check appointments if no recent activity found
      if (!hasRecentActivity) {
        const appointmentsResponse = await this.ghlClient.getContactAppointments(contactId);
        if (appointmentsResponse.success && appointmentsResponse.data) {
          for (const appointment of appointmentsResponse.data) {
            if (appointment.startTime) {
              const appointmentDate = new Date(appointment.startTime.replace('Z', '+00:00'));
              if (appointmentDate >= startDate) {
                hasRecentActivity = true;
              }
              if (!lastActivityDate || appointmentDate > lastActivityDate) {
                lastActivityDate = appointmentDate;
              }
            }
          }
        }
      }

      // 3. Check notes if no recent activity found
      if (!hasRecentActivity) {
        const notesResponse = await this.ghlClient.getContactNotes(contactId);
        if (notesResponse.success && notesResponse.data) {
          for (const note of notesResponse.data) {
            if (note.dateAdded) {
              const noteDate = new Date(note.dateAdded.replace('Z', '+00:00'));
              if (noteDate >= startDate) {
                hasRecentActivity = true;
              }
              if (!lastActivityDate || noteDate > lastActivityDate) {
                lastActivityDate = noteDate;
              }
            }
          }
        }
      }

      // Check tasks using dueDate - if a task has a recent due date, it's active
      // If a task has no due date, it's considered inactive (not time-bound)
      if (!hasRecentActivity) {
        const tasksResponse = await this.ghlClient.getContactTasks(contactId);
        if (tasksResponse.success && tasksResponse.data) {
          for (const task of tasksResponse.data) {
            if (task.dueDate) {
              const dueDate = new Date(task.dueDate.replace('Z', '+00:00'));
              if (dueDate >= startDate) {
                hasRecentActivity = true;
              }
              if (!lastActivityDate || dueDate > lastActivityDate) {
                lastActivityDate = dueDate;
              }
            }
            // If task has no due date, it's considered inactive (no time constraint)
          }
        }
      }
    } catch (error) {
      console.error(`Error checking activity for contact ${contactId}:`, error);
      // Continue with the check - don't throw
    }

    return {
      inactive: !hasRecentActivity,
      lastActivityDate
    };
  }
}
