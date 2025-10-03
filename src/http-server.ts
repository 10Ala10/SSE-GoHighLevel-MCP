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
import { InactivityTools } from './tools/inactivity-tools';
import { UserTools } from './tools/user-tools';
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
  // private ghlClient: GHLApiClient | null;
  private contactTools: ContactTools | null;
  private conversationTools: ConversationTools | null;
  private blogTools: BlogTools | null;
  private opportunityTools: OpportunityTools | null;
  private calendarTools: CalendarTools | null;
  private emailTools: EmailTools | null;
  private locationTools: LocationTools | null;
  private emailISVTools: EmailISVTools | null;
  private socialMediaTools: SocialMediaTools | null;
  private mediaTools: MediaTools | null;
  private objectTools: ObjectTools | null;
  private associationTools: AssociationTools | null;
  private customFieldV2Tools: CustomFieldV2Tools | null;
  private workflowTools: WorkflowTools | null;
  private surveyTools: SurveyTools | null;
  private storeTools: StoreTools | null;
  private productsTools: ProductsTools | null;
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

    // NOTE: No longer using global GHL client - each user connection creates its own client from headers
    // this.ghlClient = this.initializeGHLClient();

    // NOTE: No longer using global tools - tools are created per-user in SSE handlers
    // Initialize tools with null (deprecated)
    this.contactTools = null;
    this.conversationTools = null;
    this.blogTools = null;
    this.opportunityTools = null;
    this.calendarTools = null;
    this.emailTools = null;
    this.locationTools = null;
    this.emailISVTools = null;
    this.socialMediaTools = null;
    this.mediaTools = null;
    this.objectTools = null;
    this.associationTools = null;
    this.customFieldV2Tools = null;
    this.workflowTools = null;
    this.surveyTools = null;
    this.storeTools = null;
    this.productsTools = null;

    // NOTE: No longer setting up global MCP handlers - handlers are created per-user
    // this.setupMCPHandlers();
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
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-GHL-Base-URL'],
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
   * NOTE: Deprecated - GHL clients are now created per-user from headers
   */
  private initializeGHLClient(): GHLApiClient {
    throw new Error('Global GHL client initialization is deprecated. Use per-user clients via headers.');
  }

  /**
   * Decode JWT token to extract location ID from authClassId
   */
  private decodeLocationIdFromToken(token: string): string {
    try {
      // Remove Bearer prefix if present
      const jwt = token.replace('Bearer ', '');

      // Split the JWT into parts
      const parts = jwt.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      // Decode the payload (second part)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      // Extract location ID from authClassId
      const locationId = payload.authClassId;
      if (!locationId) {
        throw new Error('authClassId not found in token payload');
      }

      return locationId;
    } catch (error) {
      console.error('[GHL MCP] Error decoding JWT token:', error);
      throw new Error('Failed to decode location ID from token');
    }
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
   * Create a new MCP server instance and tools for a specific user
   */
  private createMCPServerForUser(ghlClient: GHLApiClient): { server: Server, tools: any } {
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
    const inactivityTools = new InactivityTools(ghlClient);
    const userTools = new UserTools(ghlClient);
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
          ...inactivityTools.getToolDefinitions(),
          ...userTools.getToolDefinitions(),
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

    return {
      server: userServer,
      tools: {
        inactivityTools,
        userTools,
        contactTools,
        conversationTools,
        blogTools,
        opportunityTools,
        calendarTools,
        emailTools,
        locationTools,
        emailISVTools,
        socialMediaTools,
        mediaTools,
        objectTools,
        associationTools,
        customFieldV2Tools,
        workflowTools,
        surveyTools,
        storeTools,
        productsTools
      }
    };
  }


  /**
   * Setup HTTP routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
        res.json({ 
          status: 'healthy',
          server: 'ghl-mcp-server',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          tools: this.getToolsCount(),
        authentication: 'per-user via Authorization header',
        note: 'GHL API connection tested per-user on SSE connection'
      });
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
        res.json({
        message: 'Tools are created per-user on SSE connection',
        authentication: 'Use Authorization header to connect via SSE',
        available_tool_count: this.getToolsCount().total,
        endpoint: 'Connect to /sse with Authorization header to get user-specific tools'
      });
    });

    // SSE endpoint for MCP connection (works for both ChatGPT and ElevenLabs)
    const handleSSE = async (req: express.Request, res: express.Response) => {
      const sessionId = req.query.sessionId || 'unknown';
      const isElevenLabs = req.url?.includes('/elevenlabs') || req.headers['user-agent']?.includes('python-httpx');
      const client = isElevenLabs ? 'ElevenLabs' : 'Claude/ChatGPT';
      console.log(`[${client} MCP] New SSE connection from: ${req.ip}, sessionId: ${sessionId}, method: ${req.method}, url: ${req.url}`);
      console.log(`[${client} MCP] Headers:`, JSON.stringify(req.headers, null, 2));

      try {
        // Extract GHL credentials from Authorization header
        const authHeader = req.headers['authorization'] as string;
        const ghlBaseUrl = (req.headers['x-ghl-base-url'] as string) || 'https://services.leadconnectorhq.com';

        if (!authHeader) {
          console.error(`[${client} MCP] Missing Authorization header for session: ${sessionId}`);
          if (!res.headersSent) {
            res.status(400).json({ error: 'Authorization header is required' });
          }
          return;
        }

        console.log(`[${client} MCP] Decoding location ID from token for session: ${sessionId}`);

        // Extract API key and decode location ID from JWT token
        const ghlApiKey = authHeader.replace('Bearer ', '');
        const ghlLocationId = this.decodeLocationIdFromToken(authHeader);

        console.log(`[${client} MCP] Creating GHL client for user session: ${sessionId}, location: ${ghlLocationId}`);

        // Create a new GHL client instance for this connection
        const userGHLClient = this.createGHLClientForUser(ghlApiKey, ghlLocationId, ghlBaseUrl);

        // Create a new MCP server instance for this user
        const userServer = this.createMCPServerForUser(userGHLClient);

        // Create SSE transport - always use '/sse' as the path for consistency
        const transport = new SSEServerTransport('/sse', res);
        
        // Connect user's MCP server to transport
        await userServer.server.connect(transport);
        
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
        // Extract GHL credentials from Authorization header
        const authHeader = req.headers['authorization'] as string;
        const ghlBaseUrl = (req.headers['x-ghl-base-url'] as string) || 'https://services.leadconnectorhq.com';

        if (!authHeader) {
          console.error(`[${client} MCP] Missing Authorization header for session: ${sessionId}`);
          if (!res.headersSent) {
            res.status(400).json({ error: 'Authorization header is required' });
          }
          return;
        }

        console.log(`[${client} MCP] Decoding location ID from token for session: ${sessionId}`);

        // Extract API key and decode location ID from JWT token
        const ghlApiKey = authHeader.replace('Bearer ', '');
        const ghlLocationId = this.decodeLocationIdFromToken(authHeader);

        console.log(`[${client} MCP] Creating GHL client for user session: ${sessionId}, location: ${ghlLocationId}`);

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
        await userServer.server.connect(transport);
        
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

    // Store active MCP transports and their associated user servers and tools
    const activeTransports = new Map<string, any>();
    const transportsByIndex = new Map<number, any>();
    const userServers = new Map<string, Server>(); // sessionId -> user server
    const serversByIndex = new Map<number, Server>(); // index -> user server
    const userTools = new Map<string, any>(); // sessionId -> user tools object
    const toolsByIndex = new Map<number, any>(); // index -> user tools object
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
        // Extract GHL credentials from Authorization header
        const authHeader = req.headers['authorization'] as string;
        const ghlBaseUrl = (req.headers['x-ghl-base-url'] as string) || 'https://services.leadconnectorhq.com';

        if (!authHeader) {
          console.error(`[${client} MCP] Missing Authorization header for session: ${sessionId}`);
          if (!res.headersSent) {
            res.status(400).json({ error: 'Authorization header is required' });
          }
          return;
        }

        console.log(`[${client} MCP] Decoding location ID from token for session: ${sessionId}`);

        // Extract API key and decode location ID from JWT token
        const ghlApiKey = authHeader.replace('Bearer ', '');
        const ghlLocationId = this.decodeLocationIdFromToken(authHeader);

        console.log(`[${client} MCP] Creating GHL client for user session: ${sessionId}, location: ${ghlLocationId}`);

        // Create a new GHL client instance for this connection
        const userGHLClient = this.createGHLClientForUser(ghlApiKey, ghlLocationId, ghlBaseUrl);

        // Create a new MCP server instance and tools for this user
        const { server: userServer, tools: userToolInstances } = this.createMCPServerForUser(userGHLClient);

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
      
        // Store the transport, server, and tools multiple ways for robust lookup
      activeTransports.set(sessionId.toString(), transport);
      transportsByIndex.set(currentIndex, transport);
        userServers.set(sessionId.toString(), userServer);
        serversByIndex.set(currentIndex, userServer);
        userTools.set(sessionId.toString(), userToolInstances);
        toolsByIndex.set(currentIndex, userToolInstances);
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
          userServers.delete(sessionId.toString());
          serversByIndex.delete(currentIndex);
          userTools.delete(sessionId.toString());
          toolsByIndex.delete(currentIndex);
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
          // Find the user's MCP server
          let userServer = userServers.get(sessionId.toString());

          // If not found by session ID, try by IP or index
          if (!userServer && req.ip) {
            // Try to find the server by IP (if we stored it by IP)
            // For now, we'll look for the most recent server as fallback
            if (serversByIndex.size > 0) {
              const lastIndex = Math.max(...Array.from(serversByIndex.keys()));
              userServer = serversByIndex.get(lastIndex);
              if (userServer) {
                console.log(`[${client} MCP] Using most recent user server (index: ${lastIndex})`);
              }
            }
          }

          // Find the user's tools
          let userToolsObj = userTools.get(sessionId.toString());

          // If not found by session ID, try by index
          if (!userToolsObj && serversByIndex.size > 0) {
            const lastIndex = Math.max(...Array.from(serversByIndex.keys()));
            userToolsObj = toolsByIndex.get(lastIndex);
          }

          if (userServer && userToolsObj) {
            // Route the message to the user's MCP server
            try {
              await this.processMCPMessageForUser(userServer, userToolsObj, req.body, transport);
            } catch (error) {
              console.error(`[${client} MCP] Error processing message:`, error);
              const errorResponse = {
                jsonrpc: '2.0',
                id: req.body.id,
                error: {
                  code: -32603,
                  message: 'Message processing failed'
                }
              };
              transport.send(errorResponse);
            }
          } else {
            console.error(`[${client} MCP] No user server found for session: ${sessionId}`);
            const errorResponse = {
              jsonrpc: '2.0',
              id: req.body.id,
              error: {
                code: -32603,
                message: 'No active session found'
              }
            };
            transport.send(errorResponse);
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
          // Find the user's MCP server
          let userServer = userServers.get(sessionId.toString());

          // If not found by session ID, try by IP or index
          if (!userServer && req.ip) {
            // Try to find the server by IP (if we stored it by IP)
            // For now, we'll look for the most recent server as fallback
            if (serversByIndex.size > 0) {
              const lastIndex = Math.max(...Array.from(serversByIndex.keys()));
              userServer = serversByIndex.get(lastIndex);
              if (userServer) {
                console.log(`[${client} MCP] Using most recent user server (index: ${lastIndex})`);
              }
            }
          }

          // Find the user's tools
          let userToolsObj = userTools.get(sessionId.toString());

          // If not found by session ID, try by index
          if (!userToolsObj && serversByIndex.size > 0) {
            const lastIndex = Math.max(...Array.from(serversByIndex.keys()));
            userToolsObj = toolsByIndex.get(lastIndex);
          }

          if (userServer && userToolsObj) {
            // Route the message to the user's MCP server
            try {
              await this.processMCPMessageForUser(userServer, userToolsObj, req.body, transport);
            } catch (error) {
              console.error(`[${client} MCP] Error processing message:`, error);
              const errorResponse = {
                jsonrpc: '2.0',
                id: req.body.id,
                error: {
                  code: -32603,
                  message: 'Message processing failed'
                }
              };
              transport.send(errorResponse);
            }
          } else {
            console.error(`[${client} MCP] No user server found for session: ${sessionId}`);
              const errorResponse = {
                jsonrpc: '2.0',
                id: req.body.id,
                error: {
                  code: -32603,
                message: 'No active session found'
                }
              };
              transport.send(errorResponse);
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

    // NOTE: Webhook functionality disabled - requires per-user authentication
    // Webhooks would need Authorization header to work with per-user setup
    /*
    this.app.post('/webhook/update-contact', async (req, res) => {
      // Webhook functionality would need to extract user credentials from headers
      // and create per-user tools to work properly
      res.status(501).json({ error: 'Webhook functionality temporarily disabled - use per-user SSE connections' });
    });
    */

    // NOTE: Webhook handlers disabled - require per-user authentication
    /*
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
    */

    // NOTE: Debug endpoint disabled - requires per-user authentication
    /*
    this.app.get('/debug/test-calendar/:calendarId', async (req, res) => {
      res.status(501).json({ error: 'Debug endpoint disabled - use per-user SSE connections with Authorization header' });
    });
    */

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
    // NOTE: This method is deprecated since tool execution is now handled per-user
    // Tool execution is handled in createMCPServerForUser() for each connection
    console.warn(`[GHL MCP] executeToolCall() called for ${name} but tools are now per-user`);
    throw new Error(`Tool execution not available - use per-user connections via SSE`);
  }

  /**
   * Process MCP message for a specific user server
   */
  private async processMCPMessageForUser(userServer: Server, userTools: any, message: any, transport: any) {
    if (message.method === 'initialize') {
      // Use the client's requested protocol version if we support it
      const clientVersion = message.params?.protocolVersion || '2024-11-05';
      const supportedVersions = ['2024-11-05', '2025-03-26'];
      const protocolVersion = supportedVersions.includes(clientVersion) ? clientVersion : '2024-11-05';

      const response = {
        jsonrpc: '2.0',
        id: message.id,
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
      console.log(`[MCP] Sent initialize response with protocol version: ${protocolVersion}`);
    } else {
      // For other messages, we need to handle them through the user's server
      // Since the transport is already connected to the user server, we can try to process it
      // For now, manually handle tools/list and tools/call
      // Route to the handlers that were set up in createMCPServerForUser
      if (message.method === 'tools/list') {
        try {
          // Get tools from the user's tool instances directly
          const tools = [
            ...userTools.inactivityTools.getToolDefinitions(),
            ...userTools.userTools.getToolDefinitions(),
            ...userTools.contactTools.getToolDefinitions(),
            ...userTools.conversationTools.getToolDefinitions(),
            ...userTools.blogTools.getToolDefinitions(),
            ...userTools.opportunityTools.getToolDefinitions(),
            ...userTools.calendarTools.getToolDefinitions(),
            ...userTools.emailTools.getToolDefinitions(),
            ...userTools.locationTools.getToolDefinitions(),
            ...userTools.emailISVTools.getToolDefinitions(),
            ...userTools.socialMediaTools.getTools(),
            ...userTools.mediaTools.getToolDefinitions(),
            ...userTools.objectTools.getToolDefinitions(),
            ...userTools.associationTools.getTools(),
            ...userTools.customFieldV2Tools.getTools(),
            ...userTools.workflowTools.getTools(),
            ...userTools.surveyTools.getTools(),
            ...userTools.storeTools.getTools(),
            ...userTools.productsTools.getTools()
          ];

          transport.send({
            jsonrpc: '2.0',
            id: message.id,
            result: { tools }
          });
        } catch (error) {
          console.error('[MCP] Error getting tools list:', error);
          const errorResponse = {
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32603,
              message: 'Failed to get tools list'
            }
          };
          transport.send(errorResponse);
        }
      } else if (message.method === 'tools/call') {
        try {
          // Route tool calls to the appropriate tool instance
          const { name, arguments: args = {} } = message.params || {};
      let result: any;

      if (this.isInactivityTool(name)) {
            result = await userTools.inactivityTools.executeTool(name, args);
      } else if (this.isUserTool(name)) {
            result = await userTools.userTools.executeTool(name, args);
      } else if (this.isContactTool(name)) {
            result = await userTools.contactTools.executeTool(name, args);
      } else if (this.isConversationTool(name)) {
            result = await userTools.conversationTools.executeTool(name, args);
      } else if (this.isBlogTool(name)) {
            result = await userTools.blogTools.executeTool(name, args);
      } else if (this.isOpportunityTool(name)) {
            result = await userTools.opportunityTools.executeTool(name, args);
      } else if (this.isCalendarTool(name)) {
            result = await userTools.calendarTools.executeTool(name, args);
      } else if (this.isEmailTool(name)) {
            result = await userTools.emailTools.executeTool(name, args);
      } else if (this.isLocationTool(name)) {
            result = await userTools.locationTools.executeTool(name, args);
      } else if (this.isEmailISVTool(name)) {
            result = await userTools.emailISVTools.executeTool(name, args);
      } else if (this.isSocialMediaTool(name)) {
            result = await userTools.socialMediaTools.executeTool(name, args);
      } else if (this.isMediaTool(name)) {
            result = await userTools.mediaTools.executeTool(name, args);
      } else if (this.isObjectTool(name)) {
            result = await userTools.objectTools.executeTool(name, args);
      } else if (this.isAssociationTool(name)) {
            result = await userTools.associationTools.executeAssociationTool(name, args);
      } else if (this.isCustomFieldV2Tool(name)) {
            result = await userTools.customFieldV2Tools.executeCustomFieldV2Tool(name, args);
      } else if (this.isWorkflowTool(name)) {
            result = await userTools.workflowTools.executeWorkflowTool(name, args);
      } else if (this.isSurveyTool(name)) {
            result = await userTools.surveyTools.executeSurveyTool(name, args);
      } else if (this.isStoreTool(name)) {
            result = await userTools.storeTools.executeStoreTool(name, args);
      } else if (this.isProductsTool(name)) {
            result = await userTools.productsTools.executeProductsTool(name, args);
      } else {
        throw new Error(`Unknown tool: ${name}`);
      }

          transport.send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
              content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
              }]
            }
          });
    } catch (error) {
          console.error('[MCP] Error calling tool:', error);
      const errorResponse = {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
              message: error instanceof Error ? error.message : 'Tool execution failed'
            }
          };
          transport.send(errorResponse);
        }
      } else {
        // For unsupported methods
        const errorResponse = {
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32000,
            message: `Method ${message.method} not supported`
          }
        };
        transport.send(errorResponse);
      }
    }
  }



  /**
   * Get tools count summary
   */
  private getToolsCount() {
    // Static tool counts since tools are now created per-user
    return {
      inactivity: 2,    // detect_contacts_inactivity, detect_opportunities_inactivity
      user: 5,          // create_user, search_users, get_user, update_user, delete_user
      contact: 42,      // contacts, conversations, tasks, notes, OTP, etc.
      conversation: 12, // send SMS/email, get conversations, etc.
      blog: 5,          // blog posts, sites, authors, categories
      opportunity: 9,   // search, create, update opportunities
      calendar: 20,     // events, appointments, slots, etc.
      email: 3,         // email templates
      location: 17,     // location management, custom fields, etc.
      emailISV: 1,      // email verification
      socialMedia: 10,  // posts, accounts, scheduling
      media: 3,         // upload, list, delete media
      objects: 4,       // custom objects CRUD
      associations: 5,  // object relationships
      customFieldsV2: 4, // custom fields management
      workflows: 1,     // workflow listing
      surveys: 2,       // surveys and submissions
      store: 15,        // shipping, products, etc.
      products: 14,     // product management
      total: 174        // sum of all above
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

  private isInactivityTool(toolName: string): boolean {
    const inactivityToolNames = [
      'detect_contacts_inactivity', 'detect_opportunities_inactivity'
    ];
    return inactivityToolNames.includes(toolName);
  }

  private isUserTool(toolName: string): boolean {
    const userToolNames = [
      'create_user', 'search_users', 'get_user', 'update_user', 'delete_user'
    ];
    return userToolNames.includes(toolName);
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
   * NOTE: Deprecated - GHL connections are now tested per-user
   */
  private async testGHLConnection(): Promise<void> {
    console.warn('[GHL MCP HTTP] testGHLConnection() called but connections are now tested per-user');
    throw new Error('Global GHL connection testing is deprecated. Use per-user connections.');
  }

  /**
   * Start the HTTP server
   */
  async start(): Promise<void> {
    console.log('🚀 Starting GoHighLevel MCP HTTP Server...');
    console.log('=========================================');
    
    try {
      // NOTE: No longer testing global GHL connection - connections are tested per-user
      // await this.testGHLConnection();
      
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
