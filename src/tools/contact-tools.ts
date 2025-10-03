/**
 * GoHighLevel Contact Tools
 * Implements all contact management functionality for the MCP server
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GHLApiClient } from '../clients/ghl-api-client.js';
import {
  MCPCreateContactParams,
  MCPSearchContactsParams,
  MCPUpdateContactParams,
  MCPAddContactTagsParams,
  MCPRemoveContactTagsParams,
  // Task Management
  MCPGetContactTasksParams,
  MCPCreateContactTaskParams,
  MCPGetContactTaskParams,
  MCPUpdateContactTaskParams,
  MCPDeleteContactTaskParams,
  MCPUpdateTaskCompletionParams,
  // Note Management
  MCPGetContactNotesParams,
  MCPCreateContactNoteParams,
  MCPGetContactNoteParams,
  MCPUpdateContactNoteParams,
  MCPDeleteContactNoteParams,
  // Advanced Operations
  MCPUpsertContactParams,
  MCPGetDuplicateContactParams,
  MCPGetContactsByBusinessParams,
  MCPGetContactAppointmentsParams,
  // Bulk Operations
  MCPBulkUpdateContactTagsParams,
  MCPBulkUpdateContactBusinessParams,
  // Followers Management
  MCPAddContactFollowersParams,
  MCPRemoveContactFollowersParams,
  // Campaign Management
  MCPAddContactToCampaignParams,
  MCPRemoveContactFromCampaignParams,
  MCPRemoveContactFromAllCampaignsParams,
  // Workflow Management
  MCPAddContactToWorkflowParams,
  MCPRemoveContactFromWorkflowParams,
  GHLContact,
  GHLSearchContactsResponse,
  GHLContactTagsResponse,
  GHLTask,
  GHLNote,
  GHLAppointment,
  GHLUpsertContactResponse,
  GHLBulkTagsResponse,
  GHLBulkBusinessResponse,
  GHLFollowersResponse
} from '../types/ghl-types.js';

/**
 * Contact Tools class
 * Provides comprehensive contact management capabilities
 */
export class ContactTools {
  constructor(private ghlClient: GHLApiClient) {}

  /**
   * Get tool definitions for all contact operations
   */
  getToolDefinitions(): Tool[] {
    return [
      // Basic Contact Management
      {
        name: 'create_contact',
        description: 'Create a new contact in GoHighLevel',
        inputSchema: {
          type: 'object',
          properties: {
            firstName: { type: 'string', description: 'Contact first name' },
            lastName: { type: 'string', description: 'Contact last name' },
            email: { type: 'string', description: 'Contact email address' },
            phone: { type: 'string', description: 'Contact phone number' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags to assign to contact' },
            source: { type: 'string', description: 'Source of the contact' }
          },
          required: ['email']
        }
      },
      {
        name: 'search_contacts',
        description: 'Search for contacts by email, phone, or name. CRITICAL: Always use the "query" parameter - never use email or phone parameters as they cause API errors.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { 
              type: 'string', 
              description: 'REQUIRED: Use this for email addresses, phone numbers, or names. Examples: "john@example.com", "+1234567890", "John Smith"' 
            },
            limit: { type: 'number', description: 'Maximum number of results (default: 25)' }
          },
          required: ['query']
        }
      },
      {
        name: 'get_contact',
        description: 'Get detailed information about a specific contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' }
          },
          required: ['contactId']
        }
      },
      {
        name: 'update_contact',
        description: 'Update contact information including custom fields',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            firstName: { type: 'string', description: 'Contact first name' },
            lastName: { type: 'string', description: 'Contact last name' },
            email: { type: 'string', description: 'Contact email address' },
            phone: { type: 'string', description: 'Contact phone number' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags to assign to contact' },
            customFields: { 
              type: 'object', 
              description: 'Custom field updates as key-value pairs where key is field ID',
              additionalProperties: { type: 'string' }
            }
          },
          required: ['contactId']
        }
      },
      {
        name: 'delete_contact',
        description: 'Delete a contact from GoHighLevel',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' }
          },
          required: ['contactId']
        }
      },
      {
        name: 'add_contact_tags',
        description: 'Add tags to a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags to add' }
          },
          required: ['contactId', 'tags']
        }
      },
      {
        name: 'remove_contact_tags',
        description: 'Remove tags from a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags to remove' }
          },
          required: ['contactId', 'tags']
        }
      },

      // Task Management
      {
        name: 'get_contact_tasks',
        description: 'Get all tasks for a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' }
          },
          required: ['contactId']
        }
      },
      {
        name: 'create_contact_task',
        description: 'Create a new task for a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            title: { type: 'string', description: 'Task title' },
            body: { type: 'string', description: 'Task description' },
            dueDate: { type: 'string', description: 'Due date (ISO format)' },
            completed: { type: 'boolean', description: 'Task completion status' },
            assignedTo: { type: 'string', description: 'User ID to assign task to' }
          },
          required: ['contactId', 'title', 'dueDate']
        }
      },
      {
        name: 'get_contact_task',
        description: 'Get a specific task for a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            taskId: { type: 'string', description: 'Task ID' }
          },
          required: ['contactId', 'taskId']
        }
      },
      {
        name: 'update_contact_task',
        description: 'Update a task for a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            taskId: { type: 'string', description: 'Task ID' },
            title: { type: 'string', description: 'Task title' },
            body: { type: 'string', description: 'Task description' },
            dueDate: { type: 'string', description: 'Due date (ISO format)' },
            completed: { type: 'boolean', description: 'Task completion status' },
            assignedTo: { type: 'string', description: 'User ID to assign task to' }
          },
          required: ['contactId', 'taskId']
        }
      },
      {
        name: 'delete_contact_task',
        description: 'Delete a task for a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            taskId: { type: 'string', description: 'Task ID' }
          },
          required: ['contactId', 'taskId']
        }
      },
      {
        name: 'update_task_completion',
        description: 'Update task completion status',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            taskId: { type: 'string', description: 'Task ID' },
            completed: { type: 'boolean', description: 'Completion status' }
          },
          required: ['contactId', 'taskId', 'completed']
        }
      },

      // Note Management
      {
        name: 'get_contact_notes',
        description: 'Get all notes for a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' }
          },
          required: ['contactId']
        }
      },
      {
        name: 'create_contact_note',
        description: 'Create a new note for a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            body: { type: 'string', description: 'Note content' },
            userId: { type: 'string', description: 'User ID creating the note' }
          },
          required: ['contactId', 'body']
        }
      },
      {
        name: 'get_contact_note',
        description: 'Get a specific note for a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            noteId: { type: 'string', description: 'Note ID' }
          },
          required: ['contactId', 'noteId']
        }
      },
      {
        name: 'update_contact_note',
        description: 'Update a note for a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            noteId: { type: 'string', description: 'Note ID' },
            body: { type: 'string', description: 'Note content' },
            userId: { type: 'string', description: 'User ID updating the note' }
          },
          required: ['contactId', 'noteId', 'body']
        }
      },
      {
        name: 'delete_contact_note',
        description: 'Delete a note for a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            noteId: { type: 'string', description: 'Note ID' }
          },
          required: ['contactId', 'noteId']
        }
      },

      // Advanced Contact Operations
      {
        name: 'upsert_contact',
        description: 'Create or update contact based on email/phone (smart merge)',
        inputSchema: {
          type: 'object',
          properties: {
            firstName: { type: 'string', description: 'Contact first name' },
            lastName: { type: 'string', description: 'Contact last name' },
            email: { type: 'string', description: 'Contact email address' },
            phone: { type: 'string', description: 'Contact phone number' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags to assign to contact' },
            source: { type: 'string', description: 'Source of the contact' },
            assignedTo: { type: 'string', description: 'User ID to assign contact to' }
          }
        }
      },
      {
        name: 'get_duplicate_contact',
        description: 'Check for duplicate contacts by email or phone',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Email to check for duplicates' },
            phone: { type: 'string', description: 'Phone to check for duplicates' }
          }
        }
      },
      {
        name: 'get_contacts_by_business',
        description: 'Get contacts associated with a specific business',
        inputSchema: {
          type: 'object',
          properties: {
            businessId: { type: 'string', description: 'Business ID' },
            limit: { type: 'number', description: 'Maximum number of results' },
            skip: { type: 'number', description: 'Number of results to skip' },
            query: { type: 'string', description: 'Search query' }
          },
          required: ['businessId']
        }
      },
      {
        name: 'get_contact_appointments',
        description: 'Get all appointments for a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' }
          },
          required: ['contactId']
        }
      },

      // Bulk Operations
      {
        name: 'bulk_update_contact_tags',
        description: 'Bulk add or remove tags from multiple contacts',
        inputSchema: {
          type: 'object',
          properties: {
            contactIds: { type: 'array', items: { type: 'string' }, description: 'Array of contact IDs' },
            tags: { type: 'array', items: { type: 'string' }, description: 'Tags to add or remove' },
            operation: { type: 'string', enum: ['add', 'remove'], description: 'Operation to perform' },
            removeAllTags: { type: 'boolean', description: 'Remove all existing tags before adding new ones' }
          },
          required: ['contactIds', 'tags', 'operation']
        }
      },
      {
        name: 'bulk_update_contact_business',
        description: 'Bulk update business association for multiple contacts',
        inputSchema: {
          type: 'object',
          properties: {
            contactIds: { type: 'array', items: { type: 'string' }, description: 'Array of contact IDs' },
            businessId: { type: 'string', description: 'Business ID (null to remove from business)' }
          },
          required: ['contactIds']
        }
      },

      // Followers Management
      {
        name: 'add_contact_followers',
        description: 'Add followers to a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            followers: { type: 'array', items: { type: 'string' }, description: 'Array of user IDs to add as followers' }
          },
          required: ['contactId', 'followers']
        }
      },
      {
        name: 'remove_contact_followers',
        description: 'Remove followers from a contact',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            followers: { type: 'array', items: { type: 'string' }, description: 'Array of user IDs to remove as followers' }
          },
          required: ['contactId', 'followers']
        }
      },

      // Campaign Management
      {
        name: 'add_contact_to_campaign',
        description: 'Add contact to a marketing campaign',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            campaignId: { type: 'string', description: 'Campaign ID' }
          },
          required: ['contactId', 'campaignId']
        }
      },
      {
        name: 'remove_contact_from_campaign',
        description: 'Remove contact from a specific campaign',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            campaignId: { type: 'string', description: 'Campaign ID' }
          },
          required: ['contactId', 'campaignId']
        }
      },
      {
        name: 'remove_contact_from_all_campaigns',
        description: 'Remove contact from all campaigns',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' }
          },
          required: ['contactId']
        }
      },

      // Workflow Management
      {
        name: 'add_contact_to_workflow',
        description: 'Add contact to a workflow',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            workflowId: { type: 'string', description: 'Workflow ID' },
            eventStartTime: { type: 'string', description: 'Event start time (ISO format)' }
          },
          required: ['contactId', 'workflowId']
        }
      },
      {
        name: 'remove_contact_from_workflow',
        description: 'Remove contact from a workflow',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID' },
            workflowId: { type: 'string', description: 'Workflow ID' },
            eventStartTime: { type: 'string', description: 'Event start time (ISO format)' }
          },
          required: ['contactId', 'workflowId']
        }
      },

      // OTP/Verification Tools
      {
        name: 'start_email_verification',
        description: 'Start email verification process by triggering GHL workflow',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Email address to verify' },
            firstName: { type: 'string', description: 'User first name (optional)' },
            lastName: { type: 'string', description: 'User last name (optional)' }
          },
          required: ['email']
        }
      },
      {
        name: 'start_sms_verification',
        description: 'Start SMS verification process by adding sms-code tag',
        inputSchema: {
          type: 'object',
          properties: {
            phone: { type: 'string', description: 'Phone number to verify' },
            firstName: { type: 'string', description: 'User first name (optional)' },
            lastName: { type: 'string', description: 'User last name (optional)' },
            contactId: { type: 'string', description: 'Existing contact ID to update with phone (widget flow - optional)' }
          },
          required: ['phone']
        }
      },
      {
        name: 'start_whatsapp_verification',
        description: 'Start WhatsApp verification process by adding whatsapp-code tag',
        inputSchema: {
          type: 'object',
          properties: {
            phone: { type: 'string', description: 'Phone number to verify' },
            firstName: { type: 'string', description: 'User first name (optional)' },
            lastName: { type: 'string', description: 'User last name (optional)' },
            contactId: { type: 'string', description: 'Existing contact ID to update with phone (widget flow - optional)' }
          },
          required: ['phone']
        }
      },
      {
        name: 'verify_code',
        description: 'Verify the 6-digit code for email, SMS, or WhatsApp verification',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID (from previous search_contacts call)' },
            code: { type: 'string', description: '6-digit verification code from user' },
            method: { type: 'string', enum: ['email', 'sms', 'whatsapp'], description: 'Verification method' }
          },
          required: ['contactId', 'code', 'method']
        }
      },
      {
        name: 'resend_verification_code',
        description: 'Resend verification code by clearing old code and restarting verification process',
        inputSchema: {
          type: 'object',
          properties: {
            contactId: { type: 'string', description: 'Contact ID (from previous search_contacts call)' },
            method: { type: 'string', enum: ['email', 'sms', 'whatsapp'], description: 'Verification method' }
          },
          required: ['contactId', 'method']
        }
      },
      {
        name: 'check_verification_status',
        description: 'Check if an email address has been verified recently',
        inputSchema: {
          type: 'object',
          properties: {
            email: { type: 'string', description: 'Email address to check' }
          },
          required: ['email']
        }
      }
    ];
  }

  /**
   * Execute a contact tool with the given parameters
   */
  async executeTool(toolName: string, params: any): Promise<any> {
    try {
      switch (toolName) {
        // Basic Contact Management
      case 'create_contact':
          return await this.createContact(params as MCPCreateContactParams);
        case 'search_contacts':
          return await this.searchContacts(params as MCPSearchContactsParams);
        case 'get_contact':
          return await this.getContact(params.contactId);
        case 'update_contact':
          return await this.updateContact(params as MCPUpdateContactParams);
        case 'delete_contact':
          return await this.deleteContact(params.contactId);
        case 'add_contact_tags':
          return await this.addContactTags(params as MCPAddContactTagsParams);
        case 'remove_contact_tags':
          return await this.removeContactTags(params as MCPRemoveContactTagsParams);

        // Task Management
        case 'get_contact_tasks':
          return await this.getContactTasks(params as MCPGetContactTasksParams);
        case 'create_contact_task':
          return await this.createContactTask(params as MCPCreateContactTaskParams);
        case 'get_contact_task':
          return await this.getContactTask(params as MCPGetContactTaskParams);
        case 'update_contact_task':
          return await this.updateContactTask(params as MCPUpdateContactTaskParams);
        case 'delete_contact_task':
          return await this.deleteContactTask(params as MCPDeleteContactTaskParams);
        case 'update_task_completion':
          return await this.updateTaskCompletion(params as MCPUpdateTaskCompletionParams);

        // Note Management
        case 'get_contact_notes':
          return await this.getContactNotes(params as MCPGetContactNotesParams);
        case 'create_contact_note':
          return await this.createContactNote(params as MCPCreateContactNoteParams);
        case 'get_contact_note':
          return await this.getContactNote(params as MCPGetContactNoteParams);
        case 'update_contact_note':
          return await this.updateContactNote(params as MCPUpdateContactNoteParams);
        case 'delete_contact_note':
          return await this.deleteContactNote(params as MCPDeleteContactNoteParams);

        // Advanced Operations
        case 'upsert_contact':
          return await this.upsertContact(params as MCPUpsertContactParams);
        case 'get_duplicate_contact':
          return await this.getDuplicateContact(params as MCPGetDuplicateContactParams);
        case 'get_contacts_by_business':
          return await this.getContactsByBusiness(params as MCPGetContactsByBusinessParams);
        case 'get_contact_appointments':
          return await this.getContactAppointments(params as MCPGetContactAppointmentsParams);

        // Bulk Operations
        case 'bulk_update_contact_tags':
          return await this.bulkUpdateContactTags(params as MCPBulkUpdateContactTagsParams);
        case 'bulk_update_contact_business':
          return await this.bulkUpdateContactBusiness(params as MCPBulkUpdateContactBusinessParams);

        // Followers Management
        case 'add_contact_followers':
          return await this.addContactFollowers(params as MCPAddContactFollowersParams);
        case 'remove_contact_followers':
          return await this.removeContactFollowers(params as MCPRemoveContactFollowersParams);

        // Campaign Management
        case 'add_contact_to_campaign':
          return await this.addContactToCampaign(params as MCPAddContactToCampaignParams);
        case 'remove_contact_from_campaign':
          return await this.removeContactFromCampaign(params as MCPRemoveContactFromCampaignParams);
        case 'remove_contact_from_all_campaigns':
          return await this.removeContactFromAllCampaigns(params as MCPRemoveContactFromAllCampaignsParams);

        // Workflow Management
        case 'add_contact_to_workflow':
          return await this.addContactToWorkflow(params as MCPAddContactToWorkflowParams);
        case 'remove_contact_from_workflow':
          return await this.removeContactFromWorkflow(params as MCPRemoveContactFromWorkflowParams);
        
        // OTP/Verification Tools
        case 'start_email_verification':
          return await this.startEmailVerification(params);
        case 'start_sms_verification':
          return await this.startSmsVerification(params);
        case 'start_whatsapp_verification':
          return await this.startWhatsAppVerification(params);
        case 'verify_code':
          return await this.verifyCode(params);
        case 'resend_verification_code':
          return await this.resendVerificationCode(params);
        case 'check_verification_status':
          return await this.checkVerificationStatus(params);
      
      default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      console.error(`Error executing contact tool ${toolName}:`, error);
      throw error;
    }
  }

  // Implementation methods...

  // Basic Contact Management
  private async createContact(params: MCPCreateContactParams): Promise<GHLContact> {
    const response = await this.ghlClient.createContact({
        locationId: this.ghlClient.getConfig().locationId,
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        phone: params.phone,
        tags: params.tags,
      source: params.source
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create contact');
    }

    return response.data!;
  }

  private async searchContacts(params: MCPSearchContactsParams): Promise<GHLSearchContactsResponse> {
    const filters: any = {
      group: 'AND',
      filters: []
    };

    if (params.email) {
      filters.filters.push({
        field: 'email',
        operator: 'eq', // Assuming exact match
        value: params.email
      });
    }

    if (params.phone) {
      filters.filters.push({
        field: 'phone',
        operator: 'eq', // Assuming exact match
        value: params.phone
      });
    }

    const response = await this.ghlClient.searchContacts({
      locationId: this.ghlClient.getConfig().locationId,
      query: params.query,
      pageLimit: params.limit || 25,
      ...(filters.filters.length > 0 && { filters })
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to search contacts');
    }

    // Ensure we have a valid response structure
    const data = response.data || { contacts: [], total: 0 };
    
    // Additional safety check
    if (!Array.isArray(data.contacts)) {
      console.error('[ContactTools] Invalid response structure:', data);
      return { contacts: [], total: 0 };
    }

    return data;
  }

  private async getContact(contactId: string): Promise<GHLContact> {
    const response = await this.ghlClient.getContact(contactId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get contact');
    }

    return response.data!;
  }

  private async updateContact(params: MCPUpdateContactParams): Promise<GHLContact> {
    // Prepare custom fields in GHL format if provided
    let customFieldsArray: any[] | undefined = undefined;
    if (params.customFields) {
      customFieldsArray = Object.entries(params.customFields).map(([fieldId, value]) => ({
        id: fieldId,
        value: value
      }));
    }

    const response = await this.ghlClient.updateContact(params.contactId, {
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phone: params.phone,
      tags: params.tags,
      customFields: customFieldsArray
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to update contact');
    }

    return response.data!;
  }

  private async deleteContact(contactId: string): Promise<{ succeded: boolean }> {
    const response = await this.ghlClient.deleteContact(contactId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete contact');
    }

    return response.data!;
  }

  private async addContactTags(params: MCPAddContactTagsParams): Promise<GHLContactTagsResponse> {
    const response = await this.ghlClient.addContactTags(params.contactId, params.tags);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to add contact tags');
    }

    return response.data!;
  }

  private async removeContactTags(params: MCPRemoveContactTagsParams): Promise<GHLContactTagsResponse> {
    const response = await this.ghlClient.removeContactTags(params.contactId, params.tags);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to remove contact tags');
    }

    return response.data!;
  }

  // Task Management
  private async getContactTasks(params: MCPGetContactTasksParams): Promise<GHLTask[]> {
    const response = await this.ghlClient.getContactTasks(params.contactId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get contact tasks');
    }

    return response.data!;
  }

  private async createContactTask(params: MCPCreateContactTaskParams): Promise<GHLTask> {
    const response = await this.ghlClient.createContactTask(params.contactId, {
      title: params.title,
      body: params.body,
      dueDate: params.dueDate,
      completed: params.completed || false,
      assignedTo: params.assignedTo
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create contact task');
    }

    return response.data!;
  }

  private async getContactTask(params: MCPGetContactTaskParams): Promise<GHLTask> {
    const response = await this.ghlClient.getContactTask(params.contactId, params.taskId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get contact task');
    }

    return response.data!;
  }

  private async updateContactTask(params: MCPUpdateContactTaskParams): Promise<GHLTask> {
    const response = await this.ghlClient.updateContactTask(params.contactId, params.taskId, {
      title: params.title,
      body: params.body,
      dueDate: params.dueDate,
      completed: params.completed,
      assignedTo: params.assignedTo
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to update contact task');
    }

    return response.data!;
  }

  private async deleteContactTask(params: MCPDeleteContactTaskParams): Promise<{ succeded: boolean }> {
    const response = await this.ghlClient.deleteContactTask(params.contactId, params.taskId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete contact task');
    }

    return response.data!;
  }

  private async updateTaskCompletion(params: MCPUpdateTaskCompletionParams): Promise<GHLTask> {
    const response = await this.ghlClient.updateTaskCompletion(params.contactId, params.taskId, params.completed);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to update task completion');
    }

    return response.data!;
  }

  // Note Management
  private async getContactNotes(params: MCPGetContactNotesParams): Promise<GHLNote[]> {
    const response = await this.ghlClient.getContactNotes(params.contactId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get contact notes');
    }

    return response.data!;
  }

  private async createContactNote(params: MCPCreateContactNoteParams): Promise<GHLNote> {
    const response = await this.ghlClient.createContactNote(params.contactId, {
      body: params.body,
      userId: params.userId
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create contact note');
    }

    return response.data!;
  }

  private async getContactNote(params: MCPGetContactNoteParams): Promise<GHLNote> {
    const response = await this.ghlClient.getContactNote(params.contactId, params.noteId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get contact note');
    }

    return response.data!;
  }

  private async updateContactNote(params: MCPUpdateContactNoteParams): Promise<GHLNote> {
    const response = await this.ghlClient.updateContactNote(params.contactId, params.noteId, {
      body: params.body,
      userId: params.userId
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to update contact note');
    }

    return response.data!;
  }

  private async deleteContactNote(params: MCPDeleteContactNoteParams): Promise<{ succeded: boolean }> {
    const response = await this.ghlClient.deleteContactNote(params.contactId, params.noteId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete contact note');
    }

    return response.data!;
  }

  // Advanced Operations
  private async upsertContact(params: MCPUpsertContactParams): Promise<GHLUpsertContactResponse> {
    const response = await this.ghlClient.upsertContact({
      locationId: this.ghlClient.getConfig().locationId,
      firstName: params.firstName,
      lastName: params.lastName,
      name: params.name,
      email: params.email,
      phone: params.phone,
      address1: params.address,
      city: params.city,
      state: params.state,
      country: params.country,
      postalCode: params.postalCode,
      website: params.website,
      timezone: params.timezone,
      companyName: params.companyName,
      tags: params.tags,
      customFields: params.customFields,
      source: params.source,
      assignedTo: params.assignedTo
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to upsert contact');
    }

    return response.data!;
  }

  private async getDuplicateContact(params: MCPGetDuplicateContactParams): Promise<GHLContact | null> {
    const response = await this.ghlClient.getDuplicateContact(params.email, params.phone);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to check for duplicate contact');
    }

    return response.data!;
  }

  private async getContactsByBusiness(params: MCPGetContactsByBusinessParams): Promise<GHLSearchContactsResponse> {
    const response = await this.ghlClient.getContactsByBusiness(params.businessId, {
      limit: params.limit,
      skip: params.skip,
      query: params.query
    });

      if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get contacts by business');
    }

    return response.data!;
  }

  private async getContactAppointments(params: MCPGetContactAppointmentsParams): Promise<GHLAppointment[]> {
    const response = await this.ghlClient.getContactAppointments(params.contactId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get contact appointments');
    }

    return response.data!;
  }

  // Bulk Operations
  private async bulkUpdateContactTags(params: MCPBulkUpdateContactTagsParams): Promise<GHLBulkTagsResponse> {
    const response = await this.ghlClient.bulkUpdateContactTags(
      params.contactIds,
      params.tags,
      params.operation,
      params.removeAllTags
    );

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to bulk update contact tags');
    }

    return response.data!;
  }

  private async bulkUpdateContactBusiness(params: MCPBulkUpdateContactBusinessParams): Promise<GHLBulkBusinessResponse> {
    const response = await this.ghlClient.bulkUpdateContactBusiness(params.contactIds, params.businessId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to bulk update contact business');
    }

    return response.data!;
  }

  // Followers Management
  private async addContactFollowers(params: MCPAddContactFollowersParams): Promise<GHLFollowersResponse> {
    const response = await this.ghlClient.addContactFollowers(params.contactId, params.followers);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to add contact followers');
    }

    return response.data!;
  }

  private async removeContactFollowers(params: MCPRemoveContactFollowersParams): Promise<GHLFollowersResponse> {
    const response = await this.ghlClient.removeContactFollowers(params.contactId, params.followers);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to remove contact followers');
    }

    return response.data!;
  }

  // Campaign Management
  private async addContactToCampaign(params: MCPAddContactToCampaignParams): Promise<{ succeded: boolean }> {
    const response = await this.ghlClient.addContactToCampaign(params.contactId, params.campaignId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to add contact to campaign');
    }

    return response.data!;
  }

  private async removeContactFromCampaign(params: MCPRemoveContactFromCampaignParams): Promise<{ succeded: boolean }> {
    const response = await this.ghlClient.removeContactFromCampaign(params.contactId, params.campaignId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to remove contact from campaign');
    }

    return response.data!;
  }

  private async removeContactFromAllCampaigns(params: MCPRemoveContactFromAllCampaignsParams): Promise<{ succeded: boolean }> {
    const response = await this.ghlClient.removeContactFromAllCampaigns(params.contactId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to remove contact from all campaigns');
    }

    return response.data!;
  }

  // Workflow Management
  private async addContactToWorkflow(params: MCPAddContactToWorkflowParams): Promise<{ succeded: boolean }> {
    const response = await this.ghlClient.addContactToWorkflow(
      params.contactId,
      params.workflowId,
      params.eventStartTime
    );

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to add contact to workflow');
    }

    return response.data!;
  }

  private async removeContactFromWorkflow(params: MCPRemoveContactFromWorkflowParams): Promise<{ succeded: boolean }> {
    const response = await this.ghlClient.removeContactFromWorkflow(
      params.contactId,
      params.workflowId,
      params.eventStartTime
    );

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to remove contact from workflow');
    }

    return response.data!;
  }

  // OTP/Verification Implementation
  private verificationCodes = new Map<string, string>();

  /**
   * Helper function to create proper GHL timezone format
   */
  private getGHLTimestamp(): string {
    const now = new Date();
    // Format as YYYY-MM-DDTHH:MM:SS+00:00 (GHL requires this exact format)
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    const hours = String(now.getUTCHours()).padStart(2, '0');
    const minutes = String(now.getUTCMinutes()).padStart(2, '0');
    const seconds = String(now.getUTCSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+00:00`;
  }

  /**
   * Comprehensive phone number formatting with country detection
   * Returns: { formattedPhone: string, needsCountryConfirmation: boolean, detectedCountry?: string }
   */
  private analyzePhoneNumber(phone: string): { 
    formattedPhone: string; 
    needsCountryConfirmation: boolean; 
    detectedCountry?: string;
    suggestedFormat?: string;
  } {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If already has + and looks complete, still need confirmation
    if (cleaned.startsWith('+')) {
      const countryCode = this.detectCountryFromPhone(cleaned);
      return {
        formattedPhone: cleaned,
        needsCountryConfirmation: !countryCode, // Still confirm if country unclear
        detectedCountry: countryCode,
        suggestedFormat: cleaned
      };
    }
    
    // Try to detect country from digits
    const countryCode = this.detectCountryFromPhone(cleaned);
    
    if (countryCode) {
      // Add + if country detected but missing
      const formatted = cleaned.startsWith(countryCode.substring(1)) ? '+' + cleaned : countryCode + cleaned;
      return {
        formattedPhone: formatted,
        needsCountryConfirmation: true, // Always confirm detected country
        detectedCountry: countryCode,
        suggestedFormat: formatted
      };
    }
    
    // No country detected - definitely needs confirmation
    return {
      formattedPhone: '+1' + cleaned, // Default to US, but will ask for confirmation
      needsCountryConfirmation: true,
      suggestedFormat: '+1' + cleaned
    };
  }

  /**
   * Detect country from phone number patterns
   */
  private detectCountryFromPhone(phone: string): string | undefined {
    const digits = phone.replace(/[^\d]/g, '');
    
    // Common country codes and patterns
    if (digits.startsWith('1') && (digits.length === 11 || digits.length === 10)) {
      return '+1'; // US/Canada
    }
    if (digits.startsWith('65') && digits.length === 10) {
      return '+65'; // Singapore
    }
    if (digits.startsWith('60') && (digits.length === 11 || digits.length === 12)) {
      return '+60'; // Malaysia
    }
    if (digits.startsWith('44') && digits.length === 12) {
      return '+44'; // UK
    }
    if (digits.startsWith('86') && digits.length === 13) {
      return '+86'; // China
    }
    if (digits.startsWith('91') && digits.length === 12) {
      return '+91'; // India
    }
    if (digits.startsWith('61') && digits.length === 11) {
      return '+61'; // Australia
    }
    if (digits.startsWith('33') && digits.length === 11) {
      return '+33'; // France
    }
    if (digits.startsWith('49') && digits.length === 12) {
      return '+49'; // Germany
    }
    
    return undefined; // Unknown country
  }

  /**
   * Get country name from country code
   */
  private getCountryName(countryCode: string): string {
    const countries: { [key: string]: string } = {
      '+1': 'United States/Canada',
      '+65': 'Singapore', 
      '+60': 'Malaysia',
      '+44': 'United Kingdom',
      '+86': 'China',
      '+91': 'India',
      '+61': 'Australia',
      '+33': 'France',
      '+49': 'Germany'
    };
    return countries[countryCode] || 'Unknown Country';
  }

  private async startEmailVerification(params: { email: string; firstName?: string; lastName?: string }) {
    try {
      // Check if contact exists, create if not
      const contacts = await this.searchContacts({ query: params.email, limit: 1 });
      let contactId: string;

      if (contacts.contacts.length > 0) {
        const foundContact = contacts.contacts[0];
        if (!foundContact.id) {
          throw new Error('Contact found but missing ID');
        }
        contactId = foundContact.id;
        console.log('[OTP] Found existing contact:', contactId);
      } else {
        // Create new contact
        const newContact = await this.createContact({
          email: params.email,
          firstName: params.firstName || '',
          lastName: params.lastName || '',
          tags: ['verification-pending']
        });
        if (!newContact.id) {
          throw new Error('Contact created but missing ID');
        }
        contactId = newContact.id;
        console.log('[OTP] Created new contact:', contactId);
      }

      // Add email-code tag (this will trigger GHL workflow via tag conditions)
      await this.addContactTags({
        contactId: contactId,
        tags: ['email-code']
      });
      console.log('[Email Verification] Added email-code tag');

      // Trigger verification workflow by adding contact to workflow
      const workflowId = process.env.GHL_VERIFICATION_WORKFLOW_ID;
      if (workflowId) {
        try {
          await this.addContactToWorkflow({
            contactId: contactId,
            workflowId: workflowId,
            eventStartTime: this.getGHLTimestamp()
          });
          console.log('[OTP] Added contact to verification workflow:', workflowId);
        } catch (workflowError) {
          console.error('[OTP] Failed to add contact to workflow:', workflowError);
          // Continue anyway - verification might still work with tags
        }
      } else {
        console.warn('[OTP] GHL_VERIFICATION_WORKFLOW_ID not configured - emails may not send');
      }

      return {
        success: true,
        message: 'Verification code sent to your email',
        contactId: contactId,
        instructions: 'Please check your email and provide the 6-digit code'
      };
    } catch (error) {
      console.error('[OTP] Start verification error:', error);
      throw new Error('Failed to start verification process');
    }
  }

  /**
   * Start SMS verification process by adding sms-code tag
   */
  private async startSmsVerification(params: { phone: string; firstName?: string; lastName?: string; contactId?: string }) {
    try {
      // Format phone number with country code
      const phoneAnalysis = this.analyzePhoneNumber(params.phone);
      const formattedPhone = phoneAnalysis.formattedPhone;
      console.log('[SMS Verification] Starting for:', params.phone, '→ formatted:', formattedPhone);
      
      // Note: In production, you should confirm country code with user
      if (phoneAnalysis.needsCountryConfirmation) {
        console.log('[SMS Verification] Country confirmation needed for:', params.phone, 'detected:', phoneAnalysis.detectedCountry);
      }
      
      let contactId: string;
      
      // Widget flow: If contactId provided, update existing contact with phone
      if (params.contactId) {
        // Update existing contact with phone number (widget flow)
        await this.updateContact({
          contactId: params.contactId,
          phone: formattedPhone
        });
        contactId = params.contactId;
        console.log('[SMS Verification] Updated existing contact with phone:', contactId);
      } else {
        // Legacy flow: Search by phone, create if needed
        const phoneSearch = await this.searchContacts({ query: formattedPhone, limit: 1 });
        
        if (phoneSearch.contacts.length > 0) {
          // Found contact by phone - use it
          const foundContact = phoneSearch.contacts[0];
          if (!foundContact.id) {
            throw new Error('Contact found but missing ID');
          }
          contactId = foundContact.id;
          console.log('[SMS Verification] Found existing contact by phone:', contactId);
        } else {
          // For SMS-only verification without existing contact, require minimal email
          throw new Error('SMS verification requires either existing contactId or contact with email. For phone-only contacts, use start_email_verification first or provide contactId parameter.');
        }
      }

      // Add sms-code tag (this will trigger GHL workflow via tag conditions)
      await this.addContactTags({
        contactId: contactId,
        tags: ['sms-code']
      });
      console.log('[SMS Verification] Added sms-code tag');

      // Trigger verification workflow by adding contact to workflow
      const workflowId = process.env.GHL_VERIFICATION_WORKFLOW_ID;
      if (workflowId) {
        try {
          await this.addContactToWorkflow({
            contactId: contactId,
            workflowId: workflowId,
            eventStartTime: this.getGHLTimestamp()
          });
          console.log('[SMS Verification] Added contact to verification workflow:', workflowId);
        } catch (workflowError) {
          console.error('[SMS Verification] Failed to add contact to workflow:', workflowError);
          // Continue anyway - verification might still work with tags
        }
      }

      return {
        success: true,
        message: 'SMS verification started. Please check your phone for the verification code.',
        contactId: contactId,
        instructions: 'Please check your SMS and provide the 6-digit code within 5 minutes'
      };
    } catch (error) {
      console.error('[SMS Verification] Start verification error:', error);
      throw new Error('Failed to start SMS verification process');
    }
  }

  /**
   * Start WhatsApp verification process by adding whatsapp-code tag
   */
  private async startWhatsAppVerification(params: { phone: string; firstName?: string; lastName?: string; contactId?: string }) {
    try {
      // Format phone number with country code
      const phoneAnalysis = this.analyzePhoneNumber(params.phone);
      const formattedPhone = phoneAnalysis.formattedPhone;
      console.log('[WhatsApp Verification] Starting for:', params.phone, '→ formatted:', formattedPhone);
      
      // Note: In production, you should confirm country code with user
      if (phoneAnalysis.needsCountryConfirmation) {
        console.log('[WhatsApp Verification] Country confirmation needed for:', params.phone, 'detected:', phoneAnalysis.detectedCountry);
      }
      
      let contactId: string;
      
      // Widget flow: If contactId provided, update existing contact with phone
      if (params.contactId) {
        // Update existing contact with phone number (widget flow)
        await this.updateContact({
          contactId: params.contactId,
          phone: formattedPhone
        });
        contactId = params.contactId;
        console.log('[WhatsApp Verification] Updated existing contact with phone:', contactId);
      } else {
        // Legacy flow: Search by phone, create if needed
        const phoneSearch = await this.searchContacts({ query: formattedPhone, limit: 1 });
        
        if (phoneSearch.contacts.length > 0) {
          // Found contact by phone - use it
          const foundContact = phoneSearch.contacts[0];
          if (!foundContact.id) {
            throw new Error('Contact found but missing ID');
          }
          contactId = foundContact.id;
          console.log('[WhatsApp Verification] Found existing contact by phone:', contactId);
        } else {
          // For WhatsApp-only verification without existing contact, require minimal email  
          throw new Error('WhatsApp verification requires either existing contactId or contact with email. For phone-only contacts, use start_email_verification first or provide contactId parameter.');
        }
      }

      // Add whatsapp-code tag (this will trigger GHL workflow via tag conditions)
      await this.addContactTags({
        contactId: contactId,
        tags: ['whatsapp-code']
      });
      console.log('[WhatsApp Verification] Added whatsapp-code tag');

      // Trigger verification workflow by adding contact to workflow
      const workflowId = process.env.GHL_VERIFICATION_WORKFLOW_ID;
      if (workflowId) {
        try {
          await this.addContactToWorkflow({
            contactId: contactId,
            workflowId: workflowId,
            eventStartTime: this.getGHLTimestamp()
          });
          console.log('[WhatsApp Verification] Added contact to verification workflow:', workflowId);
        } catch (workflowError) {
          console.error('[WhatsApp Verification] Failed to add contact to workflow:', workflowError);
          // Continue anyway - verification might still work with tags
        }
      }

      return {
        success: true,
        message: 'WhatsApp verification started. Please check WhatsApp for the verification code.',
        contactId: contactId,
        instructions: 'Please check your WhatsApp and provide the 6-digit code within 5 minutes'
      };
    } catch (error) {
      console.error('[WhatsApp Verification] Start verification error:', error);
      throw new Error('Failed to start WhatsApp verification process');
    }
  }

  /**
   * Universal verification code checker - works for email, SMS, and WhatsApp
   * FOOLPROOF: Uses contactId directly + getContact for full details + environment variable for field ID
   */
  private async verifyCode(params: { contactId: string; code: string; method: 'email' | 'sms' | 'whatsapp' }) {
    try {
      console.log(`[Verify Code] Starting ${params.method} verification for contact:`, params.contactId);
      
      // Get FULL contact details using contactId (foolproof method)
      const contactResponse = await this.ghlClient.getContact(params.contactId);
      
      if (!contactResponse.success || !contactResponse.data) {
        console.error('[Verify Code] Failed to get contact details:', contactResponse.error);
        return {
          success: false,
          message: 'Contact not found. Please start verification first.'
        };
      }

      const contact = contactResponse.data;
      console.log('[Verify Code] Got contact details, custom fields count:', contact.customFields?.length || 0);
      
      // Get verification code field ID from environment (primary) or fallback to name search
      const verificationCodeFieldId = process.env.GHL_VERIFICATION_CODE_FIELD_ID;
      let storedCode: string | undefined;
      
      if (verificationCodeFieldId) {
        // Method 1: Use environment variable field ID (most reliable)
        const fieldById = contact.customFields?.find(field => field.id === verificationCodeFieldId);
        
        // DEBUG: Log the entire field structure
        console.log('[Verify Code] Found field structure:', JSON.stringify(fieldById, null, 2));
        
        // GHL uses "value" property, not "field_value"
        storedCode = (fieldById as any)?.value as string || 
                    fieldById?.field_value as string ||
                    (fieldById as any)?.fieldValue as string ||
                    (fieldById as any)?.customValue as string;
        
        console.log('[Verify Code] Looking for field ID:', verificationCodeFieldId, 'Found:', !!fieldById);
        console.log('[Verify Code] Raw field_value:', fieldById?.field_value);
        console.log('[Verify Code] Raw value:', (fieldById as any)?.value);
        console.log('[Verify Code] Extracted storedCode:', storedCode);
      }
      
      if (!storedCode) {
        // Method 2: Fallback - search by field name/key (backup method)
        const fieldByName = contact.customFields?.find(field => 
          field.key === 'verification_code' || 
          field.id === 'verification_code' ||
          (field as any).name === 'verification_code'
        );
        
        storedCode = (fieldByName as any)?.value as string ||
                    fieldByName?.field_value as string || 
                    (fieldByName as any)?.fieldValue as string;
        
        console.log('[Verify Code] Fallback search found field:', !!fieldByName);
        if (fieldByName) {
          console.log('[Verify Code] Fallback field structure:', JSON.stringify(fieldByName, null, 2));
        }
      }
      
      console.log('[Verify Code] Final stored code exists:', !!storedCode, 'User code:', params.code);
      
      if (!storedCode || storedCode.trim() === '') {
        console.error('[Verify Code] No verification code found in custom fields');
        console.error('[Verify Code] Available custom fields with values:', contact.customFields?.map(f => ({ 
          id: f.id, 
          key: (f as any).key,
          field_value: f.field_value,
          value: (f as any).value,
          rawField: JSON.stringify(f)
        })));
        return {
          success: false,
          message: 'No verification code found. Please start verification process first.'
        };
      }
      
      if (storedCode === params.code) {
        // Determine the correct verified tag based on method
        const verifiedTag = `verified-${params.method}`;
        const pendingTag = `${params.method}-code`;
        
        console.log(`[Verify Code] Code matches! Adding ${verifiedTag} tag`);
        
        // Add verified tag - this will trigger the workflow to continue
        await this.addContactTags({
          contactId: contact.id!,
          tags: [verifiedTag]
        });

        // Remove pending verification tag
        await this.removeContactTags({
          contactId: contact.id!,
          tags: [pendingTag, 'verification-pending']
        });

        // Clear the verification code field for security
        const verificationFieldId = process.env.GHL_VERIFICATION_CODE_FIELD_ID || 'verification_code';
        const clearFieldUpdate: Record<string, string> = {};
        clearFieldUpdate[verificationFieldId] = '';
        await this.updateContact({
          contactId: contact.id!,
          customFields: clearFieldUpdate
        });

        return {
          success: true,
          message: `${params.method.charAt(0).toUpperCase() + params.method.slice(1)} verified successfully!`,
          contactId: contact.id,
          verifiedMethod: params.method
        };
      } else {
        console.log('[Verify Code] Code mismatch. Expected:', storedCode, 'Got:', params.code);
        return {
          success: false,
          message: 'Invalid verification code. Please check and try again.',
          expectedCode: storedCode, // For debugging only - remove in production
          receivedCode: params.code
        };
      }
    } catch (error) {
      console.error(`[Verify Code] ${params.method} verification error:`, error);
      return {
        success: false,
        message: 'Verification failed. Please try again.',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Resend verification code - PROPER WORKFLOW RESET
   * Step 1: Remove from workflow FIRST, then clear fields/tags, then restart
   */
  private async resendVerificationCode(params: { contactId: string; method: 'email' | 'sms' | 'whatsapp' }) {
    try {
      console.log(`[Resend Verification] Starting ${params.method} resend for contact:`, params.contactId);
      
      // Get contact details to verify it exists
      const contactResponse = await this.ghlClient.getContact(params.contactId);
      
      if (!contactResponse.success || !contactResponse.data) {
        return {
          success: false,
          message: 'Contact not found'
        };
      }

      const contact = contactResponse.data;
      console.log('[Resend Verification] Contact found:', contact.email || contact.phone);

      // STEP 1: Remove from workflow FIRST (most important step)
      const workflowId = process.env.GHL_VERIFICATION_WORKFLOW_ID;
      if (workflowId) {
        try {
          await this.removeContactFromWorkflow({
            contactId: params.contactId,
            workflowId: workflowId,
            eventStartTime: this.getGHLTimestamp()
          });
          console.log('[Resend Verification] ✅ Removed from workflow first');
        } catch (workflowError) {
          console.error('[Resend Verification] ❌ Failed to remove from workflow:', workflowError);
          // Don't continue if workflow removal fails - this could cause issues
          return {
            success: false,
            message: 'Failed to reset verification workflow. Please try again.',
            error: workflowError instanceof Error ? workflowError.message : String(workflowError)
          };
        }
      }

      // STEP 2: Clear verification code field
      const verificationCodeFieldId = process.env.GHL_VERIFICATION_CODE_FIELD_ID || 'verification_code';
      const clearFieldUpdate: Record<string, string> = {};
      clearFieldUpdate[verificationCodeFieldId] = '';
      
      await this.updateContact({
        contactId: params.contactId,
        customFields: clearFieldUpdate
      });
      console.log('[Resend Verification] ✅ Cleared verification code field');

      // STEP 3: Clear old verification tags
      await this.removeContactTags({
        contactId: params.contactId,
        tags: ['email-code', 'sms-code', 'whatsapp-code', 'verified-email', 'verified-sms', 'verified-whatsapp', 'verification-pending']
      });
      console.log('[Resend Verification] ✅ Cleared verification tags');

      // STEP 4: Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('[Resend Verification] ✅ Cleanup wait completed');

      // STEP 5: Add the verification tag to restart the process
      const verificationTag = `${params.method}-code`;
      await this.addContactTags({
        contactId: params.contactId,
        tags: [verificationTag]
      });
      console.log(`[Resend Verification] ✅ Added ${verificationTag} tag to restart verification`);

      // STEP 6: Re-add to workflow to trigger new verification
      if (workflowId) {
        try {
          await this.addContactToWorkflow({
            contactId: params.contactId,
            workflowId: workflowId,
            eventStartTime: this.getGHLTimestamp()
          });
          console.log('[Resend Verification] ✅ Re-added contact to verification workflow');
        } catch (workflowError) {
          console.error('[Resend Verification] ❌ Failed to re-add to workflow:', workflowError);
          return {
            success: false,
            message: 'Failed to restart verification workflow. Please try again.',
            error: workflowError instanceof Error ? workflowError.message : String(workflowError)
          };
        }
      }

      return {
        success: true,
        message: `${params.method.charAt(0).toUpperCase() + params.method.slice(1)} verification code resent successfully`,
        contactId: params.contactId,
        method: params.method,
        instructions: `Please check your ${params.method === 'email' ? 'email' : params.method.toUpperCase()} for the new verification code`
      };
      
    } catch (error) {
      console.error('[Resend Verification] Error:', error);
      return {
        success: false,
        message: 'Failed to resend verification code',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async checkVerificationStatus(params: { email: string }) {
    try {
      const contacts = await this.searchContacts({ query: params.email, limit: 1 });
      
      if (contacts.contacts.length === 0) {
        return {
          verified: false,
          exists: false,
          message: 'Contact not found'
        };
      }

      const contact = contacts.contacts[0];
      const hasVerifiedTag = contact.tags?.includes('verified-email') || false;
      const verificationField = contact.customFields?.find(field => field.id === 'verification_timestamp');
      const verificationDate = verificationField?.field_value as string;

      return {
        verified: hasVerifiedTag,
        exists: true,
        contactId: contact.id,
        verificationDate: verificationDate,
        tags: contact.tags
      };
    } catch (error) {
      console.error('[OTP] Check status error:', error);
      return {
        verified: false,
        exists: false,
        message: 'Error checking verification status'
      };
    }
  }
} 