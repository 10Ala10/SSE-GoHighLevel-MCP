/**
 * GoHighLevel MCP HTTP Server
 * HTTP version for ChatGPT and ElevenLabs web integration
 */

import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';

import { GHLApiClient } from './clients/ghl-api-client';
import { ContactTools } from './tools/contact-tools';
import { ConversationTools } from './tools/conversation-tools';
import { BlogTools } from './tools/blog-tools';
import { OpportunityTools } from './tools/opportunity-tools';
import { CalendarTools } from './tools/calendar-tools';
import { EmailTools } from './tools/email-tools';
import { LocationTools } from './tools/location-tools';
import { EmailISVTools } from './tools/email-isv-tools';
import { SocialMediaTools } from './tools/social-media-tools';
import { MediaTools } from './tools/media-tools';
import { ObjectTools } from './tools/object-tools';
import { AssociationTools } from './tools/association-tools';
import { CustomFieldV2Tools } from './tools/custom-field-v2-tools';
import { WorkflowTools } from './tools/workflow-tools';
import { SurveyTools } from './tools/survey-tools';
import { StoreTools } from './tools/store-tools';
import { ProductsTools } from './tools/products-tools.js';
import { GHLConfig } from './types/ghl-types';

// Load environment variables
dotenv.config();

/**
 * HTTP MCP Server class for web deployment
 */
class GHLMCPHttpServer {
  private app: express.Application;
  private server: Server;
  private ghlClient: GHLApiClient;
  private contactTools: ContactTools;
  private conversationTools: ConversationTools;
  private blogTools: BlogTools;
  private opportunityTools: OpportunityTools;
  private calendarTools: CalendarTools;
  private emailTools: EmailTools;
  private locationTools: LocationTools;
  private emailISVTools: EmailISVTools;
  private socialMediaTools: SocialMediaTools;
  private mediaTools: MediaTools;
  private objectTools: ObjectTools;
  private associationTools: AssociationTools;
  private customFieldV2Tools: CustomFieldV2Tools;
  private workflowTools: WorkflowTools;
  private surveyTools: SurveyTools;
  private storeTools: StoreTools;
  private productsTools: ProductsTools;
  private port: number;

  constructor() {
    this.port = parseInt(process.env.PORT || process.env.MCP_SERVER_PORT || '8000');
    
    // Initialize Express app
    this.app = express();
    this.setupExpress();

    // Initialize MCP server with capabilities
    this.server = new Server(
      {
        name: 'ghl-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize GHL API client
    this.ghlClient = this.initializeGHLClient();
    
    // Initialize tools
    this.contactTools = new ContactTools(this.ghlClient);
    this.conversationTools = new ConversationTools(this.ghlClient);
    this.blogTools = new BlogTools(this.ghlClient);
    this.opportunityTools = new OpportunityTools(this.ghlClient);
    this.calendarTools = new CalendarTools(this.ghlClient);
    this.emailTools = new EmailTools(this.ghlClient);
    this.locationTools = new LocationTools(this.ghlClient);
    this.emailISVTools = new EmailISVTools(this.ghlClient);
    this.socialMediaTools = new SocialMediaTools(this.ghlClient);
    this.mediaTools = new MediaTools(this.ghlClient);
    this.objectTools = new ObjectTools(this.ghlClient);
    this.associationTools = new AssociationTools(this.ghlClient);
    this.customFieldV2Tools = new CustomFieldV2Tools(this.ghlClient);
    this.workflowTools = new WorkflowTools(this.ghlClient);
    this.surveyTools = new SurveyTools(this.ghlClient);
    this.storeTools = new StoreTools(this.ghlClient);
    this.productsTools = new ProductsTools(this.ghlClient);

    // Setup MCP handlers
    this.setupMCPHandlers();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware and configuration
   */
  private setupExpress(): void {
    // Enable CORS for ChatGPT and ElevenLabs integration
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-GHL-API-Key', 'X-GHL-Location-ID', 'X-GHL-Base-URL'],
      credentials: false
    }));

    // JSON parsing for webhook routes only
    this.app.use('/webhook', express.json());

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`[HTTP] ${req.method} ${req.path} - ${new Date().toISOString()}`);
      next();
    });
  }

  /**
   * Initialize GoHighLevel API client with configuration
   */
  private initializeGHLClient(): GHLApiClient {
    // Load configuration from environment
    const config: GHLConfig = {
      accessToken: process.env.GHL_API_KEY || '',
      baseUrl: process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com',
      version: '2021-07-28',
      locationId: process.env.GHL_LOCATION_ID || ''
    };

    // Validate required configuration
    if (!config.accessToken) {
      throw new Error('GHL_API_KEY environment variable is required');
    }

    if (!config.locationId) {
      throw new Error('GHL_LOCATION_ID environment variable is required');
    }

    console.log('[GHL MCP HTTP] Initializing GHL API client...');
    console.log(`[GHL MCP HTTP] Base URL: ${config.baseUrl}`);
    console.log(`[GHL MCP HTTP] Version: ${config.version}`);
    console.log(`[GHL MCP HTTP] Location ID: ${config.locationId}`);

    return new GHLApiClient(config);
  }

  /**
   * Create a GHL API client instance for a specific user
   */
  private createGHLClientForUser(apiKey: string, locationId: string, baseUrl?: string): GHLApiClient {
    const config: GHLConfig = {
      accessToken: apiKey,
      baseUrl: baseUrl || 'https://services.leadconnectorhq.com',
      version: '2021-07-28',
      locationId: locationId
    };

    return new GHLApiClient(config);
  }

  /**
   * Create a new MCP server instance for a specific user
   */
  private createMCPServerForUser(ghlClient: GHLApiClient): Server {
    // Create a new MCP server instance
    const userServer = new Server(
      {
        name: 'ghl-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize tools with the user's GHL client
    const contactTools = new ContactTools(ghlClient);
    const conversationTools = new ConversationTools(ghlClient);
    const blogTools = new BlogTools(ghlClient);
    const opportunityTools = new OpportunityTools(ghlClient);
    const calendarTools = new CalendarTools(ghlClient);
    const emailTools = new EmailTools(ghlClient);
    const locationTools = new LocationTools(ghlClient);
    const emailISVTools = new EmailISVTools(ghlClient);
    const socialMediaTools = new SocialMediaTools(ghlClient);
    const mediaTools = new MediaTools(ghlClient);
    const objectTools = new ObjectTools(ghlClient);
    const associationTools = new AssociationTools(ghlClient);
    const customFieldV2Tools = new CustomFieldV2Tools(ghlClient);
    const workflowTools = new WorkflowTools(ghlClient);
    const surveyTools = new SurveyTools(ghlClient);
    const storeTools = new StoreTools(ghlClient);
    const productsTools = new ProductsTools(ghlClient);

    // Setup MCP handlers for the user server
    userServer.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          ...contactTools.getToolDefinitions(),
          ...conversationTools.getToolDefinitions(),
          ...blogTools.getToolDefinitions(),
          ...opportunityTools.getToolDefinitions(),
          ...calendarTools.getToolDefinitions(),
          ...emailTools.getToolDefinitions(),
          ...locationTools.getToolDefinitions(),
          ...emailISVTools.getToolDefinitions(),
          ...socialMediaTools.getTools(),
          ...mediaTools.getToolDefinitions(),
          ...objectTools.getToolDefinitions(),
          ...associationTools.getTools(),
          ...customFieldV2Tools.getTools(),
          ...workflowTools.getTools(),
          ...surveyTools.getTools(),
          ...storeTools.getTools(),
          ...productsTools.getTools(),
        ],
      };
    });

    userServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args = {} } = request.params;

      try {
        // Route to appropriate tool handler
        if (this.isContactTool(name)) {
          return await contactTools.executeTool(name, args || {});
        } else if (this.isConversationTool(name)) {
          return await conversationTools.executeTool(name, args || {});
        } else if (this.isBlogTool(name)) {
          return await blogTools.executeTool(name, args || {});
        } else if (this.isOpportunityTool(name)) {
          return await opportunityTools.executeTool(name, args || {});
        } else if (this.isCalendarTool(name)) {
          return await calendarTools.executeTool(name, args || {});
        } else if (this.isEmailTool(name)) {
          return await emailTools.executeTool(name, args || {});
        } else if (this.isLocationTool(name)) {
          return await locationTools.executeTool(name, args || {});
        } else if (this.isEmailISVTool(name)) {
          return await emailISVTools.executeTool(name, args || {});
        } else if (this.isSocialMediaTool(name)) {
          return await socialMediaTools.executeTool(name, args || {});
        } else if (this.isMediaTool(name)) {
          return await mediaTools.executeTool(name, args || {});
        } else if (this.isObjectTool(name)) {
          return await objectTools.executeTool(name, args || {});
        } else if (this.isAssociationTool(name)) {
          return await associationTools.executeAssociationTool(name, args || {});
        } else if (this.isCustomFieldV2Tool(name)) {
          return await customFieldV2Tools.executeCustomFieldV2Tool(name, args || {});
        } else if (this.isWorkflowTool(name)) {
          return await workflowTools.executeWorkflowTool(name, args || {});
        } else if (this.isSurveyTool(name)) {
          return await surveyTools.executeSurveyTool(name, args || {});
        } else if (this.isStoreTool(name)) {
          return await storeTools.executeStoreTool(name, args || {});
        } else if (this.isProductsTool(name)) {
          return await productsTools.executeProductsTool(name, args || {});
        }

        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      } catch (error) {
        console.error(`[MCP] Tool execution error for ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    return userServer;
  }

  /**
   * Setup MCP request handlers
   */
  private setupMCPHandlers(): void {
    // Handle list tools requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log('[GHL MCP HTTP] Listing available tools...');
      
      try {
        const contactToolDefinitions = this.contactTools.getToolDefinitions();
        const conversationToolDefinitions = this.conversationTools.getToolDefinitions();
        const blogToolDefinitions = this.blogTools.getToolDefinitions();
        const opportunityToolDefinitions = this.opportunityTools.getToolDefinitions();
        const calendarToolDefinitions = this.calendarTools.getToolDefinitions();
        const emailToolDefinitions = this.emailTools.getToolDefinitions();
        const locationToolDefinitions = this.locationTools.getToolDefinitions();
        const emailISVToolDefinitions = this.emailISVTools.getToolDefinitions();
        const socialMediaToolDefinitions = this.socialMediaTools.getTools();
        const mediaToolDefinitions = this.mediaTools.getToolDefinitions();
        const objectToolDefinitions = this.objectTools.getToolDefinitions();
        const associationToolDefinitions = this.associationTools.getTools();
        const customFieldV2ToolDefinitions = this.customFieldV2Tools.getTools();
        const workflowToolDefinitions = this.workflowTools.getTools();
        const surveyToolDefinitions = this.surveyTools.getTools();
        const storeToolDefinitions = this.storeTools.getTools();
        const productsToolDefinitions = this.productsTools.getTools();
        
        const allTools = [
          ...contactToolDefinitions,
          ...conversationToolDefinitions,
          ...blogToolDefinitions,
          ...opportunityToolDefinitions,
          ...calendarToolDefinitions,
          ...emailToolDefinitions,
          ...locationToolDefinitions,
          ...emailISVToolDefinitions,
          ...socialMediaToolDefinitions,
          ...mediaToolDefinitions,
          ...objectToolDefinitions,
          ...associationToolDefinitions,
          ...customFieldV2ToolDefinitions,
          ...workflowToolDefinitions,
          ...surveyToolDefinitions,
          ...storeToolDefinitions,
          ...productsToolDefinitions
        ];
        
        console.log(`[GHL MCP HTTP] Registered ${allTools.length} tools total`);
        
        return {
          tools: allTools
        };
      } catch (error) {
        console.error('[GHL MCP HTTP] Error listing tools:', error);
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to list tools: ${error}`
        );
      }
    });

    // Handle tool execution requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      console.log(`[GHL MCP HTTP] Executing tool: ${name}`);

      try {
        let result: any;

        // Route to appropriate tool handler
        if (this.isContactTool(name)) {
          result = await this.contactTools.executeTool(name, args || {});
        } else if (this.isConversationTool(name)) {
          result = await this.conversationTools.executeTool(name, args || {});
        } else if (this.isBlogTool(name)) {
          result = await this.blogTools.executeTool(name, args || {});
        } else if (this.isOpportunityTool(name)) {
          result = await this.opportunityTools.executeTool(name, args || {});
        } else if (this.isCalendarTool(name)) {
          result = await this.calendarTools.executeTool(name, args || {});
        } else if (this.isEmailTool(name)) {
          result = await this.emailTools.executeTool(name, args || {});
        } else if (this.isLocationTool(name)) {
          result = await this.locationTools.executeTool(name, args || {});
        } else if (this.isEmailISVTool(name)) {
          result = await this.emailISVTools.executeTool(name, args || {});
        } else if (this.isSocialMediaTool(name)) {
          result = await this.socialMediaTools.executeTool(name, args || {});
        } else if (this.isMediaTool(name)) {
          result = await this.mediaTools.executeTool(name, args || {});
        } else if (this.isObjectTool(name)) {
          result = await this.objectTools.executeTool(name, args || {});
        } else if (this.isAssociationTool(name)) {
          result = await this.associationTools.executeAssociationTool(name, args || {});
        } else if (this.isCustomFieldV2Tool(name)) {
          result = await this.customFieldV2Tools.executeCustomFieldV2Tool(name, args || {});
        } else if (this.isWorkflowTool(name)) {
          result = await this.workflowTools.executeWorkflowTool(name, args || {});
        } else if (this.isSurveyTool(name)) {
          result = await this.surveyTools.executeSurveyTool(name, args || {});
        } else if (this.isStoreTool(name)) {
          result = await this.storeTools.executeStoreTool(name, args || {});
        } else if (this.isProductsTool(name)) {
          result = await this.productsTools.executeProductsTool(name, args || {});
        } else {
          throw new Error(`Unknown tool: ${name}`);
        }
        
        console.log(`[GHL MCP HTTP] Tool ${name} executed successfully`);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error(`[GHL MCP HTTP] Error executing tool ${name}:`, error);
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error}`
        );
      }
    });
  }

  /**
   * Setup HTTP routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        // Test GHL API connection
        const testResponse = await this.ghlClient.getLocationById(this.ghlClient.getConfig().locationId);
        
        res.json({ 
          status: 'healthy',
          server: 'ghl-mcp-server',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          tools: this.getToolsCount(),
          ghl: {
            connected: testResponse.success,
            locationId: this.ghlClient.getConfig().locationId,
            locationName: testResponse.data?.location?.name || 'Unknown',
            baseUrl: this.ghlClient.getConfig().baseUrl
          }
        });
      } catch (error) {
        res.json({ 
          status: 'unhealthy',
          server: 'ghl-mcp-server',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          tools: this.getToolsCount(),
          ghl: {
            connected: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            locationId: this.ghlClient.getConfig().locationId,
            baseUrl: this.ghlClient.getConfig().baseUrl
          }
        });
      }
    });

    // MCP capabilities endpoint
    this.app.get('/capabilities', (req, res) => {
      res.json({
        capabilities: {
          tools: {},
        },
        server: {
          name: 'ghl-mcp-server',
          version: '1.0.0'
        }
      });
    });

    // Tools listing endpoint
    this.app.get('/tools', async (req, res) => {
      try {
        const contactTools = this.contactTools.getToolDefinitions();
        const conversationTools = this.conversationTools.getToolDefinitions();
        const blogTools = this.blogTools.getToolDefinitions();
        const opportunityTools = this.opportunityTools.getToolDefinitions();
        const calendarTools = this.calendarTools.getToolDefinitions();
        const emailTools = this.emailTools.getToolDefinitions();
        const locationTools = this.locationTools.getToolDefinitions();
        const emailISVTools = this.emailISVTools.getToolDefinitions();
        const socialMediaTools = this.socialMediaTools.getTools();
        const mediaTools = this.mediaTools.getToolDefinitions();
        const objectTools = this.objectTools.getToolDefinitions();
        const associationTools = this.associationTools.getTools();
        const customFieldV2Tools = this.customFieldV2Tools.getTools();
        const workflowTools = this.workflowTools.getTools();
        const surveyTools = this.surveyTools.getTools();
        const storeTools = this.storeTools.getTools();
        const productsTools = this.productsTools.getTools();
        
        res.json({
          tools: [...contactTools, ...conversationTools, ...blogTools, ...opportunityTools, ...calendarTools, ...emailTools, ...locationTools, ...emailISVTools, ...socialMediaTools, ...mediaTools, ...objectTools, ...associationTools, ...customFieldV2Tools, ...workflowTools, ...surveyTools, ...storeTools, ...productsTools],
          count: contactTools.length + conversationTools.length + blogTools.length + opportunityTools.length + calendarTools.length + emailTools.length + locationTools.length + emailISVTools.length + socialMediaTools.length + mediaTools.length + objectTools.length + associationTools.length + customFieldV2Tools.length + workflowTools.length + surveyTools.length + storeTools.length + productsTools.length
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to list tools' });
      }
    });

    // SSE endpoint for MCP connection (works for both ChatGPT and ElevenLabs)
    const handleSSE = async (req: express.Request, res: express.Response) => {
      const sessionId = req.query.sessionId || 'unknown';
      const isElevenLabs = req.url?.includes('/elevenlabs') || req.headers['user-agent']?.includes('python-httpx');
      const client = isElevenLabs ? 'ElevenLabs' : 'Claude/ChatGPT';
      console.log(`[${client} MCP] New SSE connection from: ${req.ip}, sessionId: ${sessionId}, method: ${req.method}, url: ${req.url}`);
      console.log(`[${client} MCP] Headers:`, JSON.stringify(req.headers, null, 2));

      try {
        // Extract GHL credentials from headers for per-user authentication
        const ghlApiKey = req.headers['x-ghl-api-key'] as string;
        const ghlLocationId = req.headers['x-ghl-location-id'] as string;
        const ghlBaseUrl = (req.headers['x-ghl-base-url'] as string) || 'https://services.leadconnectorhq.com';
        
        if (!ghlApiKey) {
          console.error(`[${client} MCP] Missing X-GHL-API-Key header for session: ${sessionId}`);
          if (!res.headersSent) {
            res.status(400).json({ error: 'X-GHL-API-Key header is required' });
          }
          return;
        }

        if (!ghlLocationId) {
          console.error(`[${client} MCP] Missing X-GHL-Location-ID header for session: ${sessionId}`);
          if (!res.headersSent) {
            res.status(400).json({ error: 'X-GHL-Location-ID header is required' });
          }
          return;
        }

        console.log(`[${client} MCP] Creating GHL client for user session: ${sessionId}`);

        // Create a new GHL client instance for this connection
        const userGHLClient = this.createGHLClientForUser(ghlApiKey, ghlLocationId, ghlBaseUrl);

        // Create a new MCP server instance for this user
        const userServer = this.createMCPServerForUser(userGHLClient);

        // Create SSE transport - always use '/sse' as the path for consistency
        const transport = new SSEServerTransport('/sse', res);

        // Connect user's MCP server to transport
        await userServer.connect(transport);

        console.log(`[${client} MCP] SSE connection established for session: ${sessionId}`);
        console.log(`[${client} MCP] Available tools: ${this.getToolsCount().total}`);

        // Handle client disconnect
        req.on('close', () => {
          console.log(`[${client} MCP] SSE connection closed for session: ${sessionId}`);
        });

      } catch (error) {
        console.error(`[${client} MCP] SSE connection error for session ${sessionId}:`, error);
        console.error(`[${client} MCP] Error details:`, error instanceof Error ? error.stack : error);

        // Only send error response if headers haven't been sent yet
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to establish SSE connection' });
        } else {
          // If headers were already sent, close the connection
          res.end();
        }
      }
    };

    // Enhanced debug logging for MCP messages
    const logMCPMessage = (direction: string, client: string, message: any, sessionId: string) => {
      console.log(`[${client} MCP ${direction}] Session: ${sessionId}`);
      console.log(`[${client} MCP ${direction}] Message:`, JSON.stringify(message, null, 2));
    };

    // Enhanced SSE handler with detailed MCP logging
    const handleSSEWithLogging = async (req: express.Request, res: express.Response) => {
      const sessionId = req.query.sessionId || 'unknown';
      const isElevenLabs = req.url?.includes('/elevenlabs') || req.headers['user-agent']?.includes('python-httpx');
      const client = isElevenLabs ? 'ElevenLabs' : 'Claude/ChatGPT';

      console.log(`[${client} MCP] New SSE connection from: ${req.ip}, sessionId: ${sessionId}, method: ${req.method}, url: ${req.url}`);
      console.log(`[${client} MCP] Headers:`, JSON.stringify(req.headers, null, 2));

      try {
        // Extract GHL credentials from headers for per-user authentication
        const ghlApiKey = req.headers['x-ghl-api-key'] as string;
        const ghlLocationId = req.headers['x-ghl-location-id'] as string;
        const ghlBaseUrl = (req.headers['x-ghl-base-url'] as string) || 'https://services.leadconnectorhq.com';

        if (!ghlApiKey) {
          console.error(`[${client} MCP] Missing X-GHL-API-Key header for session: ${sessionId}`);
          if (!res.headersSent) {
            res.status(400).json({ error: 'X-GHL-API-Key header is required' });
          }
          return;
        }

        if (!ghlLocationId) {
          console.error(`[${client} MCP] Missing X-GHL-Location-ID header for session: ${sessionId}`);
          if (!res.headersSent) {
            res.status(400).json({ error: 'X-GHL-Location-ID header is required' });
          }
          return;
        }

        console.log(`[${client} MCP] Creating GHL client for user session: ${sessionId}`);

        // Create a new GHL client instance for this connection
        const userGHLClient = this.createGHLClientForUser(ghlApiKey, ghlLocationId, ghlBaseUrl);

        // Create a new MCP server instance for this user
        const userServer = this.createMCPServerForUser(userGHLClient);

        // IMMEDIATELY create and connect the transport so it can handle the request
        // The SSEServerTransport needs to set up its own event handlers on the request
        const transport = new SSEServerTransport('/sse', res);

        // Add message interceptors for detailed logging BEFORE connecting
        const originalSend = transport.send.bind(transport);
        transport.send = (message: any) => {
          console.log(`[${client} MCP SEND] Message:`, JSON.stringify(message, null, 2));
          return originalSend(message);
        };

        // Connect user's MCP server to transport IMMEDIATELY
        // This allows the transport to handle the POST body
        await userServer.connect(transport);

        console.log(`[${client} MCP] SSE connection established for session: ${sessionId}`);
        console.log(`[${client} MCP] Available tools: ${this.getToolsCount().total}`);

        // Handle client disconnect
        req.on('close', () => {
          console.log(`[${client} MCP] SSE connection closed for session: ${sessionId}`);
        });

      } catch (error) {
        console.error(`[${client} MCP] SSE connection error for session ${sessionId}:`, error);
        console.error(`[${client} MCP] Error details:`, error instanceof Error ? error.stack : error);

        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to establish SSE connection' });
        } else {
          res.end();
        }
      }
    };

    // Store active MCP transports - use both session ID and a simple counter for fallback
    const activeTransports = new Map<string, any>();
    const transportsByIndex = new Map<number, any>();
    let transportIndex = 0;
    
    // Handle GET for SSE connection establishment
    this.app.get('/sse', async (req, res) => {
      const sessionId = req.query.sessionId || 'unknown';
      const isElevenLabs = req.headers['user-agent']?.includes('python-httpx');
      const client = isElevenLabs ? 'ElevenLabs' : 'Claude/ChatGPT';
      const currentIndex = transportIndex++;

      console.log(`[${client} MCP] Establishing SSE connection #${currentIndex} for session: ${sessionId}`);
      console.log(`[${client} MCP] Headers:`, JSON.stringify(req.headers, null, 2));

      try {
        // Extract GHL credentials from headers for per-user authentication
        const ghlApiKey = req.headers['x-ghl-api-key'] as string;
        const ghlLocationId = req.headers['x-ghl-location-id'] as string;
        const ghlBaseUrl = (req.headers['x-ghl-base-url'] as string) || 'https://services.leadconnectorhq.com';

        if (!ghlApiKey) {
          console.error(`[${client} MCP] Missing X-GHL-API-Key header for session: ${sessionId}`);
          if (!res.headersSent) {
            res.status(400).json({ error: 'X-GHL-API-Key header is required' });
          }
          return;
        }

        if (!ghlLocationId) {
          console.error(`[${client} MCP] Missing X-GHL-Location-ID header for session: ${sessionId}`);
          if (!res.headersSent) {
            res.status(400).json({ error: 'X-GHL-Location-ID header is required' });
          }
          return;
        }

        console.log(`[${client} MCP] Creating GHL client for user session: ${sessionId}`);

        // Create a new GHL client instance for this connection
        const userGHLClient = this.createGHLClientForUser(ghlApiKey, ghlLocationId, ghlBaseUrl);

        // Create a new MCP server instance for this user
        const userServer = this.createMCPServerForUser(userGHLClient);

        // Create SSE transport and connect user's MCP server
        const transport = new SSEServerTransport('/sse', res);

        // Add message interceptors for logging
        const originalSend = transport.send.bind(transport);
        transport.send = (message: any) => {
          // Log concisely for tools/list responses to avoid rate limits
          if (message.result?.tools && Array.isArray(message.result.tools)) {
            console.log(`[${client} MCP SEND] Session: ${sessionId}`);
            console.log(`[${client} MCP SEND] tools/list response with ${message.result.tools.length} tools`);
            // Log just tool names, not full schemas
            const toolNames = message.result.tools.map((t: any) => t.name).slice(0, 10);
            console.log(`[${client} MCP SEND] First 10 tools:`, toolNames.join(', '));
          } else {
            console.log(`[${client} MCP SEND] Session: ${sessionId}`);
            console.log(`[${client} MCP SEND] Message:`, JSON.stringify(message, null, 2));
          }
          return originalSend(message);
        };

        // Connect user's MCP server to transport
        await userServer.connect(transport);

        // Store the transport multiple ways for robust lookup
        activeTransports.set(sessionId.toString(), transport);
        transportsByIndex.set(currentIndex, transport);
        // Also store by IP for ElevenLabs (they might use same IP for GET/POST)
        if (req.ip) {
          activeTransports.set(`ip:${req.ip}`, transport);
        }

        console.log(`[${client} MCP] SSE connection established for session: ${sessionId}, index: ${currentIndex}`);
        console.log(`[${client} MCP] Available tools: ${this.getToolsCount().total}`);
        console.log(`[${client} MCP] Active transports: ${activeTransports.size}`);

        // Clean up on disconnect
        req.on('close', () => {
          console.log(`[${client} MCP] SSE connection closed for session: ${sessionId}`);
          activeTransports.delete(sessionId.toString());
          transportsByIndex.delete(currentIndex);
          if (req.ip) {
            activeTransports.delete(`ip:${req.ip}`);
          }
        });
      } catch (error) {
        console.error(`[${client} MCP] SSE connection error for session ${sessionId}:`, error);
        console.error(`[${client} MCP] Error details:`, error instanceof Error ? error.stack : error);

        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to establish SSE connection' });
        } else {
          res.end();
        }
      }
    });
    
    // Handle POST for MCP messages
    this.app.post('/sse', express.json(), async (req, res) => {
      const sessionId = req.query.sessionId || 'unknown';
      const isElevenLabs = req.headers['user-agent']?.includes('python-httpx');
      const client = isElevenLabs ? 'ElevenLabs' : 'Claude/ChatGPT';

      console.log(`[${client} MCP] POST message received for session: ${sessionId}`);
      console.log(`[${client} MCP] Headers:`, JSON.stringify(req.headers, null, 2));
      // Log request concisely
      if (req.body?.method === 'tools/list') {
        console.log(`[${client} MCP] POST body: tools/list request`);
      } else {
        console.log(`[${client} MCP] POST body:`, JSON.stringify(req.body, null, 2));
      }
      
      if (req.body) {
        // Skip detailed logging for tools/list to avoid rate limits
        if (req.body?.method !== 'tools/list') {
          logMCPMessage('RECV', client, req.body, sessionId.toString());
        }
        
        // Try to find the transport - ElevenLabs might not send matching session IDs
        let transport = activeTransports.get(sessionId.toString());
        
        // If not found by session ID, try by IP
        if (!transport && req.ip) {
          transport = activeTransports.get(`ip:${req.ip}`);
          if (transport) {
            console.log(`[${client} MCP] Found transport by IP: ${req.ip}`);
          }
        }
        
        // If still not found, use the most recent transport (last resort)
        if (!transport && transportsByIndex.size > 0) {
          const lastIndex = Math.max(...Array.from(transportsByIndex.keys()));
          transport = transportsByIndex.get(lastIndex);
          if (transport) {
            console.log(`[${client} MCP] Using most recent transport (index: ${lastIndex})`);
          }
        }
        
        if (transport) {
          // The transport should handle the message internally
          // Since we can't directly send to the server, we'll send a manual response for now
          if (req.body.method === 'initialize') {
            // Use the client's requested protocol version if we support it
            const clientVersion = req.body.params?.protocolVersion || '2024-11-05';
            const supportedVersions = ['2024-11-05', '2025-03-26'];
            const protocolVersion = supportedVersions.includes(clientVersion) ? clientVersion : '2024-11-05';
            
            const response = {
              jsonrpc: '2.0',
              id: req.body.id,
              result: {
                protocolVersion: protocolVersion,
                capabilities: {
                  tools: {}
                },
                serverInfo: {
                  name: 'ghl-mcp-server',
                  version: '1.0.0'
                }
              }
            };
            // Send response through SSE
            transport.send(response);
            console.log(`[${client} MCP] Sent initialize response with protocol version: ${protocolVersion}`);
          } else if (req.body.method === 'tools/list') {
            const tools = this.getAllToolDefinitions();
            const response = {
              jsonrpc: '2.0',
              id: req.body.id,
              result: {
                tools: tools
              }
            };
            transport.send(response);
            console.log(`[${client} MCP] Sent tools/list response with ${tools.length} tools`);
          } else if (req.body.method === 'tools/call') {
            // Handle tool execution
            const { name, arguments: args } = req.body.params || {};
            console.log(`[${client} MCP] Tool call requested: ${name}`);
            console.log(`[${client} MCP] Tool arguments:`, JSON.stringify(args, null, 2));
            
            try {
              // Execute the tool using the existing handlers
              const result = await this.executeToolCall(name, args);
              console.log(`[${client} MCP] Tool execution result:`, JSON.stringify(result, null, 2));
              const response = {
                jsonrpc: '2.0',
                id: req.body.id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(result, null, 2)
                    }
                  ]
                }
              };
              transport.send(response);
              console.log(`[${client} MCP] Tool call successful: ${name}`);
            } catch (error) {
              const errorResponse = {
                jsonrpc: '2.0',
                id: req.body.id,
                error: {
                  code: -32603,
                  message: error instanceof Error ? error.message : 'Tool execution failed'
                }
              };
              transport.send(errorResponse);
              console.error(`[${client} MCP] Tool call failed: ${name}`, error);
            }
          }
        } else {
          console.error(`[${client} MCP] No transport found for session: ${sessionId}`);
        }
        
        // Acknowledge the POST request
        res.status(200).json({ status: 'received' });
      } else {
        res.status(400).json({ error: 'No body received' });
      }
    });

    // ElevenLabs MCP endpoint - Same pattern as /sse
    this.app.get('/elevenlabs', async (req, res) => {
      const sessionId = req.query.sessionId || 'unknown';
      const client = 'ElevenLabs';
      const currentIndex = transportIndex++;

      console.log(`[${client} MCP] Establishing SSE connection #${currentIndex} for session: ${sessionId}`);
      console.log(`[${client} MCP] Headers:`, JSON.stringify(req.headers, null, 2));
      
      // Create SSE transport and connect MCP server
      const transport = new SSEServerTransport('/sse', res);
      
      // Add message interceptors for logging
      const originalSend = transport.send.bind(transport);
      transport.send = (message: any) => {
        // Log concisely for tools/list responses to avoid rate limits
        if (message.result?.tools && Array.isArray(message.result.tools)) {
          console.log(`[${client} MCP SEND] Session: ${sessionId}`);
          console.log(`[${client} MCP SEND] tools/list response with ${message.result.tools.length} tools`);
          // Log just tool names, not full schemas
          const toolNames = message.result.tools.map((t: any) => t.name).slice(0, 10);
          console.log(`[${client} MCP SEND] First 10 tools:`, toolNames.join(', '));
        } else {
          console.log(`[${client} MCP SEND] Session: ${sessionId}`);
          console.log(`[${client} MCP SEND] Message:`, JSON.stringify(message, null, 2));
        }
        return originalSend(message);
      };
      
      // Connect MCP server to transport
      await this.server.connect(transport);
      
      // Store the transport multiple ways for robust lookup
      activeTransports.set(sessionId.toString(), transport);
      transportsByIndex.set(currentIndex, transport);
      if (req.ip) {
        activeTransports.set(`ip:${req.ip}`, transport);
      }
      
      console.log(`[${client} MCP] SSE connection established for session: ${sessionId}, index: ${currentIndex}`);
      console.log(`[${client} MCP] Available tools: ${this.getToolsCount().total}`);
      console.log(`[${client} MCP] Active transports: ${activeTransports.size}`);
      
      // Clean up on disconnect
      req.on('close', () => {
        console.log(`[${client} MCP] SSE connection closed for session: ${sessionId}`);
        activeTransports.delete(sessionId.toString());
        transportsByIndex.delete(currentIndex);
        if (req.ip) {
          activeTransports.delete(`ip:${req.ip}`);
        }
      });
    });
    
    this.app.post('/elevenlabs', express.json(), async (req, res) => {
      const sessionId = req.query.sessionId || 'unknown';
      const client = 'ElevenLabs';

      console.log(`[${client} MCP] POST message received for session: ${sessionId}`);
      console.log(`[${client} MCP] Headers:`, JSON.stringify(req.headers, null, 2));
      // Log request concisely
      if (req.body?.method === 'tools/list') {
        console.log(`[${client} MCP] POST body: tools/list request`);
      } else {
        console.log(`[${client} MCP] POST body:`, JSON.stringify(req.body, null, 2));
      }
      
      if (req.body) {
        // Skip detailed logging for tools/list to avoid rate limits
        if (req.body?.method !== 'tools/list') {
          logMCPMessage('RECV', client, req.body, sessionId.toString());
        }
        
        // Try to find the transport - ElevenLabs might not send matching session IDs
        let transport = activeTransports.get(sessionId.toString());
        
        // If not found by session ID, try by IP
        if (!transport && req.ip) {
          transport = activeTransports.get(`ip:${req.ip}`);
          if (transport) {
            console.log(`[${client} MCP] Found transport by IP: ${req.ip}`);
          }
        }
        
        // If still not found, use the most recent transport (last resort)
        if (!transport && transportsByIndex.size > 0) {
          const lastIndex = Math.max(...Array.from(transportsByIndex.keys()));
          transport = transportsByIndex.get(lastIndex);
          if (transport) {
            console.log(`[${client} MCP] Using most recent transport (index: ${lastIndex})`);
          }
        }
        
        if (transport) {
          if (req.body.method === 'initialize') {
            // Use the client's requested protocol version if we support it
            const clientVersion = req.body.params?.protocolVersion || '2024-11-05';
            const supportedVersions = ['2024-11-05', '2025-03-26'];
            const protocolVersion = supportedVersions.includes(clientVersion) ? clientVersion : '2024-11-05';
            
            const response = {
              jsonrpc: '2.0',
              id: req.body.id,
              result: {
                protocolVersion: protocolVersion,
                capabilities: {
                  tools: {}
                },
                serverInfo: {
                  name: 'ghl-mcp-server',
                  version: '1.0.0'
                }
              }
            };
            transport.send(response);
            console.log(`[${client} MCP] Sent initialize response with protocol version: ${protocolVersion}`);
          } else if (req.body.method === 'tools/list') {
            const tools = this.getAllToolDefinitions();
            const response = {
              jsonrpc: '2.0',
              id: req.body.id,
              result: {
                tools: tools
              }
            };
            transport.send(response);
            console.log(`[${client} MCP] Sent tools/list response with ${tools.length} tools`);
          } else if (req.body.method === 'tools/call') {
            // Handle tool execution
            const { name, arguments: args } = req.body.params || {};
            console.log(`[${client} MCP] Tool call requested: ${name}`);
            console.log(`[${client} MCP] Tool arguments:`, JSON.stringify(args, null, 2));
            
            try {
              // Execute the tool using the existing handlers
              const result = await this.executeToolCall(name, args);
              console.log(`[${client} MCP] Tool execution result:`, JSON.stringify(result, null, 2));
              const response = {
                jsonrpc: '2.0',
                id: req.body.id,
                result: {
                  content: [
                    {
                      type: 'text',
                      text: JSON.stringify(result, null, 2)
                    }
                  ]
                }
              };
              transport.send(response);
              console.log(`[${client} MCP] Tool call successful: ${name}`);
            } catch (error) {
              const errorResponse = {
                jsonrpc: '2.0',
                id: req.body.id,
                error: {
                  code: -32603,
                  message: error instanceof Error ? error.message : 'Tool execution failed'
                }
              };
              transport.send(errorResponse);
              console.error(`[${client} MCP] Tool call failed: ${name}`, error);
            }
          }
        } else {
          console.error(`[${client} MCP] No transport found for session: ${sessionId}`);
        }
        
        res.status(200).json({ status: 'received' });
      } else {
        res.status(400).json({ error: 'No body received' });
      }
    });

    // Buffer test endpoint - try different approaches
    this.app.post('/test-buffer', express.text({ type: 'application/json' }), (req, res) => {
      console.log(`[Buffer Test] Body type:`, typeof req.body);
      console.log(`[Buffer Test] Raw body:`, req.body);
      console.log(`[Buffer Test] String body:`, String(req.body));
      
      res.json({ 
        received: true, 
        type: typeof req.body,
        content: String(req.body)
      });
    });

    // ElevenLabs debug endpoint to understand the protocol
    this.app.all('/elevenlabs-debug', (req, res) => {
      console.log(`[ElevenLabs Debug] ${req.method} request`);
      console.log(`[ElevenLabs Debug] Headers:`, JSON.stringify(req.headers, null, 2));
      console.log(`[ElevenLabs Debug] Query:`, req.query);
      console.log(`[ElevenLabs Debug] URL:`, req.url);
      
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          console.log(`[ElevenLabs Debug] Body:`, body);
          res.json({ status: 'debug', received: body });
        });
      } else {
        // For GET requests, set up SSE
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });
        
        // Send a test message
        res.write(`data: {"type": "debug", "message": "ElevenLabs debug endpoint connected"}\n\n`);
        
        // Log any incoming data
        req.on('data', (chunk) => {
          console.log(`[ElevenLabs Debug] Received data on GET:`, chunk.toString());
        });
        
        req.on('close', () => {
          console.log(`[ElevenLabs Debug] Connection closed`);
        });
      }
    });

    // Webhook handler for GHL contact updates
    this.app.post('/webhook/update-contact', async (req, res) => {
      try {
        const { contactId, customFields, tags } = req.body;
        console.log(`[Contact Update Webhook] Updating contact ${contactId}`);
        
        const updateData: any = {};
        if (customFields) updateData.customFields = customFields;
        if (tags) updateData.tags = tags;
        
        const result = await this.contactTools.executeTool('update_contact', {
          contactId: contactId,
          ...updateData
        });
        
        console.log(`[Contact Update Webhook] Success:`, result);
        res.json({ success: true, result: result });
      } catch (error) {
        console.error(`[Contact Update Webhook] Error:`, error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Update failed' });
      }
    });

    // Webhook handlers for GHL verification workflow
    this.app.post('/webhook/code-sent', async (req, res) => {
      const { contactId, code, email, phone, method } = req.body;
      const recipient = email || phone || 'unknown';
      console.log(`[Verification Webhook] Code sent via ${method} to ${recipient} for contact ${contactId}`);
      res.json({ received: true, method: method });
    });

    this.app.post('/webhook/verified', async (req, res) => {
      const { contactId, email, phone, status, method } = req.body;
      const recipient = email || phone || 'unknown';
      console.log(`[Verification Webhook] ${method} verified: ${recipient} (${contactId})`);
      res.json({ 
        received: true,
        message: 'Verification successful',
        method: method
      });
    });

    this.app.post('/webhook/verification-failed', async (req, res) => {
      const { contactId, email, phone, reason, method } = req.body;
      const recipient = email || phone || 'unknown';
      console.log(`[Verification Webhook] ${method} verification failed for ${recipient}: ${reason}`);
      res.json({ 
        received: true,
        message: 'Verification failed',
        method: method,
        reason: reason
      });
    });

    // Debug endpoint for calendar testing
    this.app.get('/debug/test-calendar/:calendarId', async (req, res) => {
      try {
        const calendarId = req.params.calendarId;
        console.log(`[DEBUG] Testing calendar access: ${calendarId}`);
        
        // Use existing calendar tools to test access
        // Test free slots functionality  
        const testResult = await this.calendarTools.executeTool('get_free_slots', {
          calendarId: calendarId,
          startDate: '2025-09-25',
          endDate: '2025-09-25',
          timezone: 'Asia/Singapore'
        });
        
        res.json({
          success: true,
          calendarId: calendarId,
          testResult: testResult
        });
      } catch (error: any) {
        console.error(`[DEBUG] Calendar test failed:`, error.message);
        res.status(500).json({
          error: error.message,
          details: error.stack
        });
      }
    });

    // Root endpoint with server info
    this.app.get('/', (req, res) => {
      res.json({
        name: 'GoHighLevel MCP Server',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          capabilities: '/capabilities',
          tools: '/tools',
          sse: '/sse',
          elevenlabs: '/elevenlabs'
        },
        tools: this.getToolsCount(),
        documentation: 'https://github.com/your-repo/ghl-mcp-server'
      });
    });
  }

  /**
   * Execute a tool call
   */
  private async executeToolCall(name: string, args: any) {
    // Route to appropriate tool handler based on tool name
    if (this.isContactTool(name)) {
      return await this.contactTools.executeTool(name, args || {});
    } else if (this.isConversationTool(name)) {
      return await this.conversationTools.executeTool(name, args || {});
    } else if (this.isBlogTool(name)) {
      return await this.blogTools.executeTool(name, args || {});
    } else if (this.isOpportunityTool(name)) {
      return await this.opportunityTools.executeTool(name, args || {});
    } else if (this.isCalendarTool(name)) {
      return await this.calendarTools.executeTool(name, args || {});
    } else if (this.isEmailTool(name)) {
      return await this.emailTools.executeTool(name, args || {});
    } else if (this.isLocationTool(name)) {
      return await this.locationTools.executeTool(name, args || {});
    } else if (this.isEmailISVTool(name)) {
      return await this.emailISVTools.executeTool(name, args || {});
    } else if (this.isSocialMediaTool(name)) {
      return await this.socialMediaTools.executeTool(name, args || {});
    } else if (this.isMediaTool(name)) {
      return await this.mediaTools.executeTool(name, args || {});
    } else if (this.isObjectTool(name)) {
      return await this.objectTools.executeTool(name, args || {});
    } else if (this.isAssociationTool(name)) {
      return await this.associationTools.executeAssociationTool(name, args || {});
    } else if (this.isCustomFieldV2Tool(name)) {
      return await this.customFieldV2Tools.executeCustomFieldV2Tool(name, args || {});
    } else if (this.isWorkflowTool(name)) {
      return await this.workflowTools.executeWorkflowTool(name, args || {});
    } else if (this.isSurveyTool(name)) {
      return await this.surveyTools.executeSurveyTool(name, args || {});
    } else if (this.isStoreTool(name)) {
      return await this.storeTools.executeStoreTool(name, args || {});
    } else if (this.isProductsTool(name)) {
      return await this.productsTools.executeProductsTool(name, args || {});
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Get all tool definitions for ElevenLabs
   */
  private getAllToolDefinitions() {
    const contactTools = this.contactTools.getToolDefinitions();
    const conversationTools = this.conversationTools.getToolDefinitions();
    const blogTools = this.blogTools.getToolDefinitions();
    const opportunityTools = this.opportunityTools.getToolDefinitions();
    const calendarTools = this.calendarTools.getToolDefinitions();
    const emailTools = this.emailTools.getToolDefinitions();
    const locationTools = this.locationTools.getToolDefinitions();
    const emailISVTools = this.emailISVTools.getToolDefinitions();
    const socialMediaTools = this.socialMediaTools.getTools();
    const mediaTools = this.mediaTools.getToolDefinitions();
    const objectTools = this.objectTools.getToolDefinitions();
    const associationTools = this.associationTools.getTools();
    const customFieldV2Tools = this.customFieldV2Tools.getTools();
    const workflowTools = this.workflowTools.getTools();
    const surveyTools = this.surveyTools.getTools();
    const storeTools = this.storeTools.getTools();
    const productsTools = this.productsTools.getTools();
    
    return [
      ...contactTools,
      ...conversationTools,
      ...blogTools,
      ...opportunityTools,
      ...calendarTools,
      ...emailTools,
      ...locationTools,
      ...emailISVTools,
      ...socialMediaTools,
      ...mediaTools,
      ...objectTools,
      ...associationTools,
      ...customFieldV2Tools,
      ...workflowTools,
      ...surveyTools,
      ...storeTools,
      ...productsTools
    ];
  }

  /**
   * Handle tool call for ElevenLabs
   */
  private async handleElevenLabsToolCall(message: any, res: express.Response) {
    try {
      const { name, arguments: args } = message.params;
      console.log(`[ElevenLabs MCP] Executing tool: ${name}`);

      let result: any;

      // Route to appropriate tool handler (same logic as main server)
      if (this.isContactTool(name)) {
        result = await this.contactTools.executeTool(name, args || {});
      } else if (this.isConversationTool(name)) {
        result = await this.conversationTools.executeTool(name, args || {});
      } else if (this.isBlogTool(name)) {
        result = await this.blogTools.executeTool(name, args || {});
      } else if (this.isOpportunityTool(name)) {
        result = await this.opportunityTools.executeTool(name, args || {});
      } else if (this.isCalendarTool(name)) {
        result = await this.calendarTools.executeTool(name, args || {});
      } else if (this.isEmailTool(name)) {
        result = await this.emailTools.executeTool(name, args || {});
      } else if (this.isLocationTool(name)) {
        result = await this.locationTools.executeTool(name, args || {});
      } else if (this.isEmailISVTool(name)) {
        result = await this.emailISVTools.executeTool(name, args || {});
      } else if (this.isSocialMediaTool(name)) {
        result = await this.socialMediaTools.executeTool(name, args || {});
      } else if (this.isMediaTool(name)) {
        result = await this.mediaTools.executeTool(name, args || {});
      } else if (this.isObjectTool(name)) {
        result = await this.objectTools.executeTool(name, args || {});
      } else if (this.isAssociationTool(name)) {
        result = await this.associationTools.executeAssociationTool(name, args || {});
      } else if (this.isCustomFieldV2Tool(name)) {
        result = await this.customFieldV2Tools.executeCustomFieldV2Tool(name, args || {});
      } else if (this.isWorkflowTool(name)) {
        result = await this.workflowTools.executeWorkflowTool(name, args || {});
      } else if (this.isSurveyTool(name)) {
        result = await this.surveyTools.executeSurveyTool(name, args || {});
      } else if (this.isStoreTool(name)) {
        result = await this.storeTools.executeStoreTool(name, args || {});
      } else if (this.isProductsTool(name)) {
        result = await this.productsTools.executeProductsTool(name, args || {});
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }

      // Send success response
      const response = {
        jsonrpc: '2.0',
        id: message.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      };

      res.write(`data: ${JSON.stringify(response)}\n\n`);
      console.log(`[ElevenLabs MCP] Tool ${name} executed successfully`);

    } catch (error) {
      console.error(`[ElevenLabs MCP] Error executing tool:`, error);
      
      // Send error response
      const errorResponse = {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
          message: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        }
      };

      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
    }
  }

  /**
   * Get tools count summary
   */
  private getToolsCount() {
    return {
      contact: this.contactTools.getToolDefinitions().length,
      conversation: this.conversationTools.getToolDefinitions().length,
      blog: this.blogTools.getToolDefinitions().length,
      opportunity: this.opportunityTools.getToolDefinitions().length,
      calendar: this.calendarTools.getToolDefinitions().length,
      email: this.emailTools.getToolDefinitions().length,
      location: this.locationTools.getToolDefinitions().length,
      emailISV: this.emailISVTools.getToolDefinitions().length,
      socialMedia: this.socialMediaTools.getTools().length,
      media: this.mediaTools.getToolDefinitions().length,
      objects: this.objectTools.getToolDefinitions().length,
      associations: this.associationTools.getTools().length,
      customFieldsV2: this.customFieldV2Tools.getTools().length,
      workflows: this.workflowTools.getTools().length,
      surveys: this.surveyTools.getTools().length,
      store: this.storeTools.getTools().length,
      products: this.productsTools.getTools().length,
      total: this.contactTools.getToolDefinitions().length + 
             this.conversationTools.getToolDefinitions().length + 
             this.blogTools.getToolDefinitions().length +
             this.opportunityTools.getToolDefinitions().length +
             this.calendarTools.getToolDefinitions().length +
             this.emailTools.getToolDefinitions().length +
             this.locationTools.getToolDefinitions().length +
             this.emailISVTools.getToolDefinitions().length +
             this.socialMediaTools.getTools().length +
             this.mediaTools.getToolDefinitions().length +
             this.objectTools.getToolDefinitions().length +
             this.associationTools.getTools().length +
             this.customFieldV2Tools.getTools().length +
             this.workflowTools.getTools().length +
             this.surveyTools.getTools().length +
             this.storeTools.getTools().length +
             this.productsTools.getTools().length
    };
  }

  /**
   * Tool name validation helpers
   */
  private isContactTool(toolName: string): boolean {
    const contactToolNames = [
      // Basic Contact Management
      'create_contact', 'search_contacts', 'get_contact', 'update_contact',
      'add_contact_tags', 'remove_contact_tags', 'delete_contact',
      // OTP/Verification Tools (Updated)
      'start_email_verification', 'start_sms_verification', 'start_whatsapp_verification',
      'verify_code', 'resend_verification_code', 'check_verification_status',
      // Task Management
      'get_contact_tasks', 'create_contact_task', 'get_contact_task', 'update_contact_task',
      'delete_contact_task', 'update_task_completion',
      // Note Management
      'get_contact_notes', 'create_contact_note', 'get_contact_note', 'update_contact_note',
      'delete_contact_note',
      // Advanced Operations
      'upsert_contact', 'get_duplicate_contact', 'get_contacts_by_business', 'get_contact_appointments',
      // Bulk Operations
      'bulk_update_contact_tags', 'bulk_update_contact_business',
      // Followers Management
      'add_contact_followers', 'remove_contact_followers',
      // Campaign Management
      'add_contact_to_campaign', 'remove_contact_from_campaign', 'remove_contact_from_all_campaigns',
      // Workflow Management
      'add_contact_to_workflow', 'remove_contact_from_workflow'
    ];
    return contactToolNames.includes(toolName);
  }

  private isConversationTool(toolName: string): boolean {
    const conversationToolNames = [
      // Basic conversation operations
      'send_sms', 'send_email', 'search_conversations', 'get_conversation',
      'create_conversation', 'update_conversation', 'delete_conversation', 'get_recent_messages',
      // Message management
      'get_email_message', 'get_message', 'upload_message_attachments', 'update_message_status',
      // Manual message creation
      'add_inbound_message', 'add_outbound_call',
      // Call recordings & transcriptions
      'get_message_recording', 'get_message_transcription', 'download_transcription',
      // Scheduling management
      'cancel_scheduled_message', 'cancel_scheduled_email',
      // Live chat features
      'live_chat_typing'
    ];
    return conversationToolNames.includes(toolName);
  }

  private isBlogTool(toolName: string): boolean {
    const blogToolNames = [
      'create_blog_post', 'update_blog_post', 'get_blog_posts', 'get_blog_sites',
      'get_blog_authors', 'get_blog_categories', 'check_url_slug'
    ];
    return blogToolNames.includes(toolName);
  }

  private isOpportunityTool(toolName: string): boolean {
    const opportunityToolNames = [
      'search_opportunities', 'get_pipelines', 'get_opportunity', 'create_opportunity',
      'update_opportunity_status', 'delete_opportunity', 'update_opportunity', 
      'upsert_opportunity', 'add_opportunity_followers', 'remove_opportunity_followers'
    ];
    return opportunityToolNames.includes(toolName);
  }

  private isCalendarTool(toolName: string): boolean {
    const calendarToolNames = [
      // Calendar Groups Management
      'get_calendar_groups', 'create_calendar_group', 'validate_group_slug',
      'update_calendar_group', 'delete_calendar_group', 'disable_calendar_group',
      // Calendars
      'get_calendars', 'create_calendar', 'get_calendar', 'update_calendar', 'delete_calendar',
      // Events and Appointments
      'get_calendar_events', 'get_free_slots', 'create_appointment', 'get_appointment',
      'update_appointment', 'delete_appointment',
      // Appointment Notes
      'get_appointment_notes', 'create_appointment_note', 'update_appointment_note', 'delete_appointment_note',
      // Calendar Resources
      'get_calendar_resources', 'get_calendar_resource_by_id', 'update_calendar_resource', 'delete_calendar_resource',
      // Calendar Notifications
      'get_calendar_notifications', 'create_calendar_notification', 'update_calendar_notification', 'delete_calendar_notification',
      // Blocked Slots
      'create_block_slot', 'update_block_slot', 'get_blocked_slots', 'delete_blocked_slot'
    ];
    return calendarToolNames.includes(toolName);
  }

  private isEmailTool(toolName: string): boolean {
    const emailToolNames = [
      'get_email_campaigns', 'create_email_template', 'get_email_templates',
      'update_email_template', 'delete_email_template'
    ];
    return emailToolNames.includes(toolName);
  }

  private isLocationTool(toolName: string): boolean {
    const locationToolNames = [
      // Location Management
      'search_locations', 'get_location', 'create_location', 'update_location', 'delete_location',
      // Location Tags
      'get_location_tags', 'create_location_tag', 'get_location_tag', 'update_location_tag', 'delete_location_tag',
      // Location Tasks
      'search_location_tasks',
      // Custom Fields
      'get_location_custom_fields', 'create_location_custom_field', 'get_location_custom_field', 
      'update_location_custom_field', 'delete_location_custom_field',
      // Custom Values
      'get_location_custom_values', 'create_location_custom_value', 'get_location_custom_value',
      'update_location_custom_value', 'delete_location_custom_value',
      // Templates
      'get_location_templates', 'delete_location_template',
      // Timezones
      'get_timezones'
    ];
    return locationToolNames.includes(toolName);
  }

  private isEmailISVTool(toolName: string): boolean {
    const emailISVToolNames = [
      'verify_email'
    ];
    return emailISVToolNames.includes(toolName);
  }

  private isSocialMediaTool(toolName: string): boolean {
    const socialMediaToolNames = [
      // Post Management
      'search_social_posts', 'create_social_post', 'get_social_post', 'update_social_post',
      'delete_social_post', 'bulk_delete_social_posts',
      // Account Management
      'get_social_accounts', 'delete_social_account',
      // CSV Operations
      'upload_social_csv', 'get_csv_upload_status', 'set_csv_accounts',
      // Categories & Tags
      'get_social_categories', 'get_social_category', 'get_social_tags', 'get_social_tags_by_ids',
      // OAuth Integration
      'start_social_oauth', 'get_platform_accounts'
    ];
    return socialMediaToolNames.includes(toolName);
  }

  private isMediaTool(toolName: string): boolean {
    const mediaToolNames = [
      'get_media_files', 'upload_media_file', 'delete_media_file'
    ];
    return mediaToolNames.includes(toolName);
  }

  private isObjectTool(toolName: string): boolean {
    const objectToolNames = [
      'get_all_objects', 'create_object_schema', 'get_object_schema', 'update_object_schema',
      'create_object_record', 'get_object_record', 'update_object_record', 'delete_object_record',
      'search_object_records'
    ];
    return objectToolNames.includes(toolName);
  }

  private isAssociationTool(toolName: string): boolean {
    const associationToolNames = [
      'ghl_get_all_associations', 'ghl_create_association', 'ghl_get_association_by_id',
      'ghl_update_association', 'ghl_delete_association', 'ghl_get_association_by_key',
      'ghl_get_association_by_object_key', 'ghl_create_relation', 'ghl_get_relations_by_record',
      'ghl_delete_relation'
    ];
    return associationToolNames.includes(toolName);
  }

  private isCustomFieldV2Tool(toolName: string): boolean {
    const customFieldV2ToolNames = [
      'ghl_get_custom_field_by_id', 'ghl_create_custom_field', 'ghl_update_custom_field',
      'ghl_delete_custom_field', 'ghl_get_custom_fields_by_object_key', 'ghl_create_custom_field_folder',
      'ghl_update_custom_field_folder', 'ghl_delete_custom_field_folder'
    ];
    return customFieldV2ToolNames.includes(toolName);
  }

  private isWorkflowTool(toolName: string): boolean {
    const workflowToolNames = [
      'ghl_get_workflows'
    ];
    return workflowToolNames.includes(toolName);
  }

  private isSurveyTool(toolName: string): boolean {
    const surveyToolNames = [
      'ghl_get_surveys',
      'ghl_get_survey_submissions'
    ];
    return surveyToolNames.includes(toolName);
  }

  private isStoreTool(toolName: string): boolean {
    const storeToolNames = [
      'ghl_create_shipping_zone', 'ghl_list_shipping_zones', 'ghl_get_shipping_zone',
      'ghl_update_shipping_zone', 'ghl_delete_shipping_zone', 'ghl_get_available_shipping_rates',
      'ghl_create_shipping_rate', 'ghl_list_shipping_rates', 'ghl_get_shipping_rate',
      'ghl_update_shipping_rate', 'ghl_delete_shipping_rate', 'ghl_create_shipping_carrier',
      'ghl_list_shipping_carriers', 'ghl_get_shipping_carrier', 'ghl_update_shipping_carrier',
      'ghl_delete_shipping_carrier', 'ghl_create_store_setting', 'ghl_get_store_setting'
    ];
    return storeToolNames.includes(toolName);
  }

  private isProductsTool(toolName: string): boolean {
    const productsToolNames = [
      'ghl_create_product', 'ghl_list_products', 'ghl_get_product', 'ghl_update_product',
      'ghl_delete_product', 'ghl_bulk_update_products', 'ghl_create_price', 'ghl_list_prices',
      'ghl_get_price', 'ghl_update_price', 'ghl_delete_price', 'ghl_list_inventory',
      'ghl_update_inventory', 'ghl_get_product_store_stats', 'ghl_update_product_store',
      'ghl_create_product_collection', 'ghl_list_product_collections', 'ghl_get_product_collection',
      'ghl_update_product_collection', 'ghl_delete_product_collection', 'ghl_list_product_reviews',
      'ghl_get_reviews_count', 'ghl_update_product_review', 'ghl_delete_product_review',
      'ghl_bulk_update_product_reviews'
    ];
    return productsToolNames.includes(toolName);
  }

  /**
   * Test GHL API connection
   */
  private async testGHLConnection(): Promise<void> {
    try {
      console.log('[GHL MCP HTTP] Testing GHL API connection...');
      
      const result = await this.ghlClient.testConnection();
      
      console.log('[GHL MCP HTTP] ✅ GHL API connection successful');
      console.log(`[GHL MCP HTTP] Connected to location: ${result.data?.locationId}`);
    } catch (error) {
      console.error('[GHL MCP HTTP] ❌ GHL API connection failed:', error);
      throw new Error(`Failed to connect to GHL API: ${error}`);
    }
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    console.log('🚀 Starting GoHighLevel MCP HTTP Server...');
    console.log('=========================================');
    
    try {
      // Test GHL API connection
      await this.testGHLConnection();
      
      // Start HTTP server
      this.app.listen(this.port, '0.0.0.0', () => {
        console.log('✅ GoHighLevel MCP HTTP Server started successfully!');
        console.log(`🌐 Server running on: http://0.0.0.0:${this.port}`);
        console.log(`🔗 SSE Endpoint: http://0.0.0.0:${this.port}/sse`);
        console.log(`🔗 ElevenLabs Endpoint: http://0.0.0.0:${this.port}/elevenlabs`);
        console.log(`📋 Tools Available: ${this.getToolsCount().total}`);
        console.log('🎯 Ready for ChatGPT and ElevenLabs integration!');
        console.log('=========================================');
      });
      
    } catch (error) {
      console.error('❌ Failed to start GHL MCP HTTP Server:', error);
      process.exit(1);
    }
  }
}

/**
 * Handle graceful shutdown
 */
function setupGracefulShutdown(): void {
  const shutdown = (signal: string) => {
    console.log(`\n[GHL MCP HTTP] Received ${signal}, shutting down gracefully...`);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    // Setup graceful shutdown
    setupGracefulShutdown();
    
    // Create and start HTTP server
    const server = new GHLMCPHttpServer();
    await server.start();
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Start the server
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 
