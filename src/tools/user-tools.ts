/**
 * GoHighLevel User Tools
 * Implements all user management functionality for the MCP server
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { GHLApiClient } from '../clients/ghl-api-client.js';
import {
    GHLUser,
    GHLUserSearchResponse,
    MCPSearchUsersParams,
    MCPCreateUserParams,
    MCPUpdateUserParams
} from '../types/ghl-types.js';

/**
 * User Tools class
 * Provides comprehensive user management capabilities
 */
export class UserTools {
  constructor(private ghlClient: GHLApiClient) {}

  /**
   * Get tool definitions for all user operations
   */
  getToolDefinitions(): Tool[] {
    return [
      // Basic User Management
      {
        name: 'create_user',
        description: 'Create a new user in GoHighLevel',
        inputSchema: {
          type: 'object',
          properties: {
            firstName: { type: 'string', description: 'User first name' },
            lastName: { type: 'string', description: 'User last name' },
            email: { type: 'string', description: 'User email address' },
            phone: { type: 'string', description: 'User phone number' },
            role: { type: 'string', description: 'User role (admin, manager, agent, etc.)' },
            permissions: {
              type: 'array',
              items: { type: 'string' },
              description: 'User permissions array'
            }
          },
          required: ['firstName', 'lastName', 'email']
        }
      },
      {
        name: 'search_users',
        description: 'Search for users by email, name, or role',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for email or name'
            },
            role: { type: 'string', description: 'Filter by user role' },
            isActive: { type: 'boolean', description: 'Filter by active status' },
            limit: { type: 'number', description: 'Maximum number of results (default: 25)' }
          }
        }
      },
      {
        name: 'get_user',
        description: 'Get detailed information about a specific user',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' }
          },
          required: ['userId']
        }
      },
      {
        name: 'update_user',
        description: 'Update user information including role and permissions',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' },
            firstName: { type: 'string', description: 'User first name' },
            lastName: { type: 'string', description: 'User last name' },
            email: { type: 'string', description: 'User email address' },
            phone: { type: 'string', description: 'User phone number' },
            role: { type: 'string', description: 'User role' },
            permissions: {
              type: 'array',
              items: { type: 'string' },
              description: 'User permissions array'
            },
            isActive: { type: 'boolean', description: 'User active status' }
          },
          required: ['userId']
        }
      },
      {
        name: 'delete_user',
        description: 'Delete a user from GoHighLevel',
        inputSchema: {
          type: 'object',
          properties: {
            userId: { type: 'string', description: 'User ID' }
          },
          required: ['userId']
        }
      }
    ];
  }

  /**
   * Execute a user tool with the given parameters
   */
  async executeTool(toolName: string, params: any): Promise<any> {
    try {
      switch (toolName) {
        // Basic User Management
        case 'create_user':
          return await this.createUser(params as MCPCreateUserParams);
        case 'search_users':
          return await this.searchUsers(params as MCPSearchUsersParams);
        case 'get_user':
          return await this.getUser(params.userId);
        case 'update_user':
          return await this.updateUser(params as MCPUpdateUserParams);
        case 'delete_user':
          return await this.deleteUser(params.userId);

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      console.error(`Error executing user tool ${toolName}:`, error);
      throw error;
    }
  }

  // Implementation methods...

  // Basic User Management
  private async createUser(params: MCPCreateUserParams): Promise<GHLUser> {
    const response = await this.ghlClient.createUser({
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phone: params.phone,
      role: params.role,
      permissions: params.permissions,
      locationId: this.ghlClient.getConfig().locationId
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create user');
    }

    return response.data!;
  }

  private async searchUsers(params: MCPSearchUsersParams): Promise<GHLUserSearchResponse> {
    const response = await this.ghlClient.searchUsers({
      locationId: this.ghlClient.getConfig().locationId,
      query: params.query,
      role: params.role,
      isActive: params.isActive,
      limit: params.limit || 25
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to search users');
    }

    // Ensure we have a valid response structure
    const data = response.data || { users: [], total: 0 };

    // Additional safety check
    if (!Array.isArray(data.users)) {
      console.error('[UserTools] Invalid response structure:', data);
      return { users: [], total: 0 };
    }

    return data;
  }

  private async getUser(userId: string): Promise<GHLUser> {
    const response = await this.ghlClient.getUser(userId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get user');
    }

    return response.data!;
  }

  private async updateUser(params: MCPUpdateUserParams): Promise<GHLUser> {
    const response = await this.ghlClient.updateUser(params.userId, {
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phone: params.phone,
      role: params.role,
      permissions: params.permissions,
      isActive: params.isActive
    });

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to update user');
    }

    return response.data!;
  }

  private async deleteUser(userId: string): Promise<{ success: boolean }> {
    const response = await this.ghlClient.deleteUser(userId);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete user');
    }

    return response.data!;
  }
}
